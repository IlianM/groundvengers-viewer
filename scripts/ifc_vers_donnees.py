#!/usr/bin/env python3
"""Génère data/*.json à partir du fichier IFC du bâtiment (équipe Domotique).

Usage :  python3 scripts/ifc_vers_donnees.py chemin/vers/batiment.ifc
Pré-requis : pip install ifcopenshell numpy

Ce que le script fait :
  1. lit les niveaux, les pièces (IfcSpace) et leurs emprises ;
  2. redresse le bâtiment (les murs sont tournés d'environ 2° dans l'IFC) et le place dans le repère de l'appli
     (origine dans un coin, x sur la longueur, z sur la profondeur, mètres) ;
  3. écrit data/batiment.json : niveaux, zones (une par pièce utile), ascenseurs ;
  4. place les équipements des trois équipes (data/domotique.json, cyber.json, ia.json) dans les pièces qui leur
     correspondent : le contenu (protocole, données, risques, preuves) vient des fiches existantes, seule la
     position change. L'IFC ne contient AUCUN capteur : tous les emplacements sont des propositions à valider.

Le script est déterministe : même IFC, mêmes fichiers.
"""
import collections
import copy
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.element as U
import numpy as np

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"


# ───────────────────────── lecture de l'IFC ─────────────────────────

def lire_ifc(chemin):
    m = ifcopenshell.open(str(chemin))
    reglage = ifcopenshell.geom.settings()
    reglage.set(reglage.USE_WORLD_COORDS, True)

    def sommets(e):
        try:
            sh = ifcopenshell.geom.create_shape(reglage, e)
        except Exception:
            return None
        return np.array(sh.geometry.verts, dtype=float).reshape(-1, 3)

    def niveau_de(e):
        c = U.get_container(e) or U.get_aggregate(e)  # les pièces sont agrégées à l'étage
        return c.Name if c else None

    # angle du bâtiment : direction dominante des murs, modulo 90°
    angles, poids = [], []
    for w in m.by_type("IfcWall"):
        v = sommets(w)
        if v is None:
            continue
        xy = v[:, :2] - v[:, :2].mean(0)
        _, s, vt = np.linalg.svd(xy, full_matrices=False)
        if s[0] > 3 * s[1] + 1e-6 and s[0] * 2 > 3:
            a = math.degrees(math.atan2(vt[0][1], vt[0][0])) % 90
            angles.append(a if a < 45 else a - 90)
            poids.append(s[0])
    angles, poids = np.array(angles), np.array(poids)
    h, e = np.histogram(angles, bins=np.arange(-45, 45.5, 0.5), weights=poids)
    centre = (e[h.argmax()] + e[h.argmax() + 1]) / 2
    sel = np.abs(angles - centre) < 2
    theta = float(np.average(angles[sel], weights=poids[sel]))

    niveaux = sorted(
        [(s.Name, float(s.Elevation)) for s in m.by_type("IfcBuildingStorey")], key=lambda t: t[1]
    )
    pieces = []
    for s in m.by_type("IfcSpace"):
        v = sommets(s)
        if v is None:
            continue
        psets = U.get_psets(s)
        numero = ""
        for g in psets.values():
            if g.get("Numéro"):
                numero = g["Numéro"]
        pieces.append(dict(name=s.Name, long=s.LongName or s.Name.split(":")[0], numero=numero, niveau=niveau_de(s), v=v))
    return theta, niveaux, pieces


# ───────────────────────── classement des pièces ─────────────────────────

def sans_accent(t):
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


IGNORER = re.compile(r"^(df|gt|gt cfo|gt cfa|plb|ria|pt|asc( |$)|esc |colonne ec ef|cvc|extraction pk|ouvrages|palier asc)")
SALLE_REUNION = re.compile(r"^(salle de reu|salle projet)")


def classer(long):
    """(type, aménagement) d'une pièce d'après sa désignation ; None = gaine ou volume sans usage (pas une zone)."""
    n = sans_accent(long)
    if IGNORER.match(n):
        return None
    if n.startswith("hall"):
        return "hall", None
    if "circulation" in n or n == "sas":
        return "circulation", None
    if n.startswith("cafet"):
        return "open_space", "cafeteria"
    if SALLE_REUNION.match(n):
        return "reunion", None
    if n.startswith("open space"):
        return "open_space", None
    if n.startswith("sanitaires") or n.startswith("douches") or n.startswith("local menage"):
        return "sanitaire", None
    if n.startswith("parc de stationnement"):
        return "parking", None
    if n.startswith(("archives", "periodiques", "rapports", "proceed", "publi et doc", "stock", "z ", "rangements")):
        return "stockage", None
    if n.startswith(("bur", "dir ", "secretariat", "dspi")):
        return "bureau", None
    return "technique", None  # CFA, TGBT, RGI, onduleur, locaux techniques, reprographie, terrasses…


ABREV = [
    (r"^Bur ", "Bureau "), (r"^Bur$", "Bureau"), (r"^Dir ", "Direction "), (r"^Salle de reunion", "Salle de réunion"),
    (r"^Salle de reu ", "Salle de réunion "), (r"^Loc repro", "Local reprographie"), (r"^Local repro", "Local reprographie"),
    (r"^Cafet centrale espace doc", "Cafétéria et espace documentation"), (r"^Z ", "Zone "), (r"^LT ", "Local technique "),
    (r"^Open space", "Open space"), (r"^Periodiques", "Périodiques"), (r"^Archives definitives", "Archives définitives"),
    (r"^Proceed", "Proceedings"), (r"^Faconnage", "Façonnage"), (r"^Secretariat", "Secrétariat"), (r"^Onduleur", "Onduleurs"),
    (r"^Parc de stationnement", "Parc de stationnement"), (r"^Terrasse technique", "Terrasse technique"),
]


def nom_lisible(long, numero):
    t = long
    for motif, rempl in ABREV:
        t = re.sub(motif, rempl, t)
    t = re.sub(r"(\d+)p\b", r"\1 places", t)
    return f"{t} ({numero})" if numero else t


def effectif(type_, amen, long, aire):
    n = sans_accent(long)
    if type_ == "reunion":
        m = re.findall(r"(\d+)\s*p\b", n)
        if m:
            return int(m[-1])
        m = re.search(r"(\d+)$", n)
        return int(m.group(1)) if m else max(4, round(aire / 2.5))
    if type_ == "open_space":
        return min(24, max(4, round(aire / 3.5))) if amen == "cafeteria" else max(4, round(aire / 6.5))
    if type_ == "hall":
        return 8
    if type_ == "bureau":
        if n.startswith(("dir ", "bur directeur", "bur dir", "bur chef", "bur adj", "bur direction")) or aire < 22:
            return 1
        return 2 if aire < 40 else 3
    return 0


# ───────────────────────── construction des données ─────────────────────────

def r2(x):
    return round(float(x) + 0.0, 2)


def construire(theta, niveaux, pieces):
    t = math.radians(theta)
    toutes = np.vstack([p["v"][:, :2] for p in pieces])
    cx, cy = toutes.mean(0)

    def redresse(xy):  # rotation de −theta autour du centre : les murs deviennent parallèles aux axes
        d = xy - np.array([cx, cy])
        return np.stack([cx + d[:, 0] * math.cos(t) + d[:, 1] * math.sin(t), cy - d[:, 0] * math.sin(t) + d[:, 1] * math.cos(t)], 1)

    for p in pieces:
        p["xy"] = redresse(p["v"][:, :2])
    x_min = min(p["xy"][:, 0].min() for p in pieces)
    y_max = max(p["xy"][:, 1].max() for p in pieces)
    x_max = max(p["xy"][:, 0].max() for p in pieces)
    y_min = min(p["xy"][:, 1].min() for p in pieces)
    emprise = [r2(x_max - x_min), r2(y_max - y_min)]
    # repère de l'appli : x vers la droite, z vers l'observateur (le nord de l'IFC est donc vers −z)
    for p in pieces:
        xs, ys = p["xy"][:, 0] - x_min, y_max - p["xy"][:, 1]
        p["rect"] = [r2(xs.min()), r2(ys.min()), r2(xs.max() - xs.min()), r2(ys.max() - ys.min())]

    noms = {"SS2": "Sous-sol 2", "SS1": "Sous-sol 1", "R0": "Rez-de-chaussée", "R1": "Niveau 1", "R2": "Niveau 2", "R3": "Niveau 3", "TT": "Toiture-terrasse"}
    lvls = []
    for i, (nom, alt) in enumerate(niveaux):
        haut = round(niveaux[i + 1][1] - alt, 2) if i + 1 < len(niveaux) else 1.2
        rects = [p["rect"] for p in pieces if p["niveau"] == nom]
        x0 = min(r[0] for r in rects); z0 = min(r[1] for r in rects)
        x1 = max(r[0] + r[2] for r in rects); z1 = max(r[1] + r[3] for r in rects)
        lvls.append(dict(id=nom, nom=noms.get(nom, nom), altitude=round(alt, 2), hauteur=haut, emprise=[r2(x0), r2(z0), r2(x1 - x0), r2(z1 - z0)]))

    # zones
    zones, vus = [], collections.Counter()
    for p in pieces:
        c = classer(p["long"])
        r = p["rect"]
        aire = r[2] * r[3]
        if c is None or aire < 3.5 or p["niveau"] is None:
            continue
        type_, amen = c
        ident = p["numero"] or p["name"].split(":")[-1][-5:]
        slug = re.sub(r"[^A-Z0-9]+", "-", sans_accent(p["long"]).upper()).strip("-")
        base = f"ZONE-{p['niveau']}-{ident if p['numero'] else slug + '-' + ident}"
        vus[base] += 1
        zid = base if vus[base] == 1 else f"{base}-{vus[base]}"
        z = dict(
            id=zid, niveau=p["niveau"], nom=nom_lisible(p["long"], p["numero"]), type=type_,
            effectif_max=effectif(type_, amen, p["long"], aire),
            detection_presence=type_ in ("open_space", "reunion", "hall"), rect=r,
        )
        if amen:
            z["amenagement"] = amen
        z["_long"] = sans_accent(p["long"])
        z["_aire"] = aire
        zones.append(z)
    # circulations en dernier : une pièce qui les recoupe est trouvée en premier (zoneContenant)
    zones.sort(key=lambda z: (z["type"] == "circulation", z["niveau"]))
    lvl_ordre = {n["id"]: i for i, n in enumerate(lvls)}
    zones.sort(key=lambda z: (z["type"] == "circulation", lvl_ordre[z["niveau"]], z["rect"][0], z["rect"][1]))

    # ascenseurs : les trois cages de l'IFC
    asc = []
    for libelle, ids in (("Asc 01 02", ("ASC-01", "ASC-02")), ("Asc 03", ("ASC-03",))):
        cage = [p for p in pieces if p["long"] == libelle]
        if not cage:
            continue
        r = cage[0]["rect"]
        niv = sorted({p["niveau"] for p in cage}, key=lambda n: lvl_ordre[n])
        cx_, cz_ = r[0] + r[2] / 2, r[1] + r[3] / 2
        taille = [r2(min(1.6, r[2] - 0.3)), r2(min(1.6, (r[3] - 0.3) / len(ids)))]
        for k, i in enumerate(ids):
            dz = (k - (len(ids) - 1) / 2) * (r[3] / len(ids))
            asc.append(dict(id=i, nom=f"Ascenseur {i[-2:]}", position=[r2(cx_), r2(cz_ + dz)], taille=taille, niveaux=niv))

    return emprise, lvls, zones, asc


# ───────────────────────── équipements ─────────────────────────

class Plan:
    def __init__(self, lvls, zones):
        self.lvls, self.zones = lvls, zones

    def z(self, niveau, motif, i=0):
        liste = [z for z in self.zones if z["niveau"] == niveau and re.match(motif, z["_long"])]
        liste.sort(key=lambda z: (z["rect"][0], z["rect"][1]))
        return liste[i] if len(liste) > i else None

    def tous(self, niveau, type_=None, motif=None):
        return [z for z in self.zones if z["niveau"] == niveau and (type_ is None or z["type"] == type_) and (motif is None or re.match(motif, z["_long"]))]


def centre(z, h):
    r = z["rect"]
    return [r2(r[0] + r[2] / 2), h, r2(r[1] + r[3] / 2)]


def emplacements(z, n, h):
    """n positions réparties dans la pièce, en retrait des murs (grille régulière)."""
    r = z["rect"]
    cols = max(1, min(n, int((r[2] - 0.6) // 1.0) or 1))
    rows = math.ceil(n / cols)
    sortie = []
    for k in range(n):
        c, l = k % cols, k // cols
        x = r[0] + (r[2] * (c + 1)) / (cols + 1)
        zz = r[1] + (r[3] * (l + 1)) / (rows + 1)
        sortie.append([r2(x), h, r2(zz)])
    return sortie


def charger(nom):
    """Fiches d'équipement de la maquette précédente (scripts/gabarits) : elles fournissent protocole, données, risques et preuves."""
    return json.loads((RACINE / "scripts" / "gabarits" / f"{nom}.json").read_text(encoding="utf-8"))


def gabarit(fichier, id_):
    for e in fichier["equipements"]:
        if e["id"] == id_:
            return copy.deepcopy(e)
    raise KeyError(id_)


def cloner(modele, id_, niveau, zone, pos, nom=None, **maj):
    e = copy.deepcopy(modele)
    e["id"], e["niveau"], e["position"] = id_, niveau, pos
    if zone:
        e["zone"] = zone["id"] if isinstance(zone, dict) else zone
    else:
        e.pop("zone", None)
    if nom:
        e["nom"] = nom
    e.update(maj)
    return e


def court(nom):
    return re.sub(r"\s*\(N2-[\d-]+\)", "", nom)


def equipements(plan):
    dom, cyb, ia = charger("domotique"), charger("cyber"), charger("ia")
    d_eq, c_eq, i_eq = [], [], []
    NIV = ["R0", "R1", "R2", "R3"]

    # locaux techniques
    rgi1, rgi2 = plan.z("SS1", r"rgi 01"), plan.z("SS1", r"rgi 02")
    tgbt, eau, toit = plan.z("SS1", r"tgbt"), plan.z("SS1", r"lt eau fr"), plan.z("TT", r"toiture terrasse")
    cfa = {n: plan.z(n, r"cfa") for n in NIV}
    hall = plan.z("R0", r"hall")
    cafet = plan.z("R0", r"cafet")

    # ── Domotique ──
    aut = gabarit(dom, "AUT-IZOT-R1")
    for n in NIV:
        d_eq.append(cloner(aut, f"AUT-IZOT-{n}", n, cfa[n], centre(cfa[n], 1.5), f"Contrôleur Izot {n}"))
    co2, ir, temp, poste = gabarit(dom, "CAP-CO2-R1-01"), gabarit(dom, "CAP-IR-R1-01"), gabarit(dom, "CAP-TEMP-R1-01"), gabarit(dom, "CAP-POSTE-R1-01")
    ir_bur = gabarit(dom, "CAP-IR-R2-02")
    adr = collections.Counter()
    ids_niveau = collections.defaultdict(lambda: collections.defaultdict(list))
    for n in NIV:
        lieux = [z for z in plan.tous(n) if z["type"] in ("reunion", "open_space")]
        k = 0
        for z in lieux:
            k += 1
            i = f"CAP-CO2-{n}-{k:02d}"
            genre = "open space" if z["type"] == "open_space" and z.get("amenagement") != "cafeteria" else "cafétéria" if z.get("amenagement") else "réunion"
            e = cloner(co2, i, n, z, centre(z, 2.5), f"Sonde CO2 · {court(z['nom'])}")
            e["config"] = dict(e.get("config", {}), adresse=f"1/{NIV.index(n)}/{k:02d}")
            if k > 1:
                e["preuves"] = []
            d_eq.append(e); ids_niveau[n]["co2"].append(i)
        # présence infrarouge : open spaces, hall, grandes salles de réunion (une mesure agrégée par pièce)
        grandes = [z for z in lieux if z["type"] == "open_space" or z["effectif_max"] >= 15]
        if n == "R0" and hall:
            grandes = [hall] + grandes
        for k, z in enumerate(grandes, 1):
            i = f"CAP-IR-{n}-{k:02d}"
            e = cloner(ir, i, n, z, centre(z, 3.2), f"Présence infrarouge · {court(z['nom'])}")
            if k > 1:
                e["preuves"] = []
            d_eq.append(e); ids_niveau[n]["ir"].append(i)
        # sonde d'ambiance dans un bureau de direction
        dirs = [z for z in plan.tous(n, "bureau") if z["_long"].startswith(("dir ", "bur directeur", "bur direction", "bur dir "))]
        if dirs:
            z = dirs[0]
            i = f"CAP-TEMP-{n}-01"
            e = cloner(temp, i, n, z, centre(z, 1.5), f"Sonde d'ambiance · {court(z['nom'])}")
            e["preuves"] = ["PRV-VERBATIM-SOPHIE"] if n == "R1" else []
            d_eq.append(e); ids_niveau[n]["temp"].append(i)
    # une pièce de 2 personnes munie d'un détecteur : le cas d'école de la ré-identification
    bur2 = [z for z in plan.tous("R2", "bureau") if z["effectif_max"] == 2] or [z for z in plan.zones if z["type"] == "bureau" and z["effectif_max"] == 2]
    if bur2:
        z = bur2[0]
        d_eq.append(cloner(ir_bur, f"CAP-IR-{z['niveau']}-RH", z["niveau"], z, centre(z, 3.2), f"Présence infrarouge · {court(z['nom'])}"))
        ids_niveau[z["niveau"]]["ir_bur"].append(f"CAP-IR-{z['niveau']}-RH")
    # postes de travail de l'open space principal (donnée identifiante, hors minimum vital)
    ops = [z for z in plan.tous("R3", "open_space") if not z.get("amenagement")]
    ops.sort(key=lambda z: -z["_aire"])
    if ops:
        z = ops[0]
        pos2 = emplacements(z, 4, 0.6)
        for k in (0, 1):
            i = f"CAP-POSTE-R3-{k + 1:02d}"
            d_eq.append(cloner(poste, i, "R3", z, pos2[k], f"Capteur sous bureau, poste {k + 1:02d} · {court(z['nom'])}"))
            ids_niveau["R3"]["poste"].append(i)
        d_eq.append(cloner(gabarit(dom, "ECL-R1-01"), "ECL-R3-01", "R3", z, centre(z, 3.3), f"Éclairage · {court(z['nom'])}"))
        r = z["rect"]
        d_eq.append(cloner(gabarit(dom, "STORE-R1-01"), "STORE-R3-01", "R3", z, [r2(r[0] + 0.3), 2.5, r2(r[1] + r[3] / 2)], "Stores façade R3"))
    # compteurs, régulation, supervision
    cpt = gabarit(dom, "CPT-ELEC-R1")
    d_eq.append(cloner(gabarit(dom, "CPT-ELEC-TGBT"), "CPT-ELEC-TGBT", "SS1", tgbt, centre(tgbt, 1.5)))
    for n in NIV:
        d_eq.append(cloner(cpt, f"CPT-ELEC-{n}", n, cfa[n], [r2(centre(cfa[n], 1.5)[0] - 0.5), 1.5, centre(cfa[n], 1.5)[2]], f"Compteur tableau {n}"))
    d_eq.append(cloner(gabarit(dom, "CPT-CAL-R0"), "CPT-CAL-SS1", "SS1", eau, centre(eau, 1.0)))
    d_eq.append(cloner(gabarit(dom, "REG-PAC-R0"), "REG-PAC-TT", "TT", toit, centre(toit, 1.0), "Régulateur PAC (toiture technique)"))
    p2 = emplacements(rgi2, 4, 1.0)
    d_eq.append(cloner(gabarit(dom, "GW-ISMA-R0"), "GW-ISMA-SS1", "SS1", rgi2, [p2[0][0], 1.5, p2[0][2]]))
    d_eq.append(cloner(gabarit(dom, "SRV-NIAGARA"), "SRV-NIAGARA", "SS1", rgi2, p2[1]))
    d_eq.append(cloner(gabarit(dom, "ECR-R0-01"), "ECR-R0-01", "R0", hall, [r2(hall["rect"][0] + hall["rect"][2] / 2), 1.5, r2(hall["rect"][1] + 0.3)]))

    # ── Cyber ──
    p1 = emplacements(rgi1, 6, 1.2)
    c_eq.append(cloner(gabarit(cyb, "BOX-INTERNET"), "BOX-INTERNET", "SS1", rgi1, p1[0]))
    c_eq.append(cloner(gabarit(cyb, "FW-01"), "FW-01", "SS1", rgi1, p1[1]))
    c_eq.append(cloner(gabarit(cyb, "SW-BUR-01"), "SW-BUR-01", "SS1", rgi1, p1[2]))
    c_eq.append(cloner(gabarit(cyb, "SW-GTB-01"), "SW-GTB-01", "SS1", rgi2, p2[2]))
    c_eq.append(cloner(gabarit(cyb, "BAIE-R0-01"), "BAIE-SS1-01", "SS1", rgi1, p1[3], "Baie réseau SS1 (cœur de réseau)"))
    c_eq.append(cloner(gabarit(cyb, "GW-CLOUD-01"), "GW-CLOUD-01", "SS1", rgi1, p1[4]))
    coffret = gabarit(cyb, "BAIE-R1-01")
    for n in NIV:
        p = centre(cfa[n], 1.0)
        c_eq.append(cloner(coffret, f"BAIE-{n}-01", n, cfa[n], [r2(p[0] + 0.6), 1.0, p[2]], f"Coffret réseau {n}"))
    ap = gabarit(cyb, "AP-WIFI-R1-01")
    aps = collections.defaultdict(list)
    for n in NIV:
        circ = sorted(plan.tous(n, "circulation"), key=lambda z: -z["_aire"])[:3]
        circ.sort(key=lambda z: z["rect"][0])
        if len(circ) < 3:
            circ = (circ * 3)[:3]
        for k, z in enumerate(circ, 1):
            i = f"AP-WIFI-{n}-{k:02d}"
            e = cloner(ap, i, n, z, centre(z, 3.3), f"Borne Wi-Fi · {n}, secteur {k}")
            e["risques"] = ["RSK-INTRUSION"] if (n == "R1" and k == 1) or (n == "R0" and k == 1) else []
            c_eq.append(e); aps[n].append(i)
    c_eq.append(cloner(gabarit(cyb, "CAM-R0-01"), "CAM-R0-01", "R0", hall, [r2(hall["rect"][0] + 1.0), 3.2, r2(hall["rect"][1] + 1.0)]))
    c_eq.append(cloner(gabarit(cyb, "BADGE-R0-01"), "BADGE-R0-01", "R0", hall, [r2(hall["rect"][0] + hall["rect"][2] - 1.0), 1.2, r2(hall["rect"][1] + 0.3)]))

    # ── IA ──
    i_eq.append(cloner(gabarit(ia, "SRV-IA-01"), "SRV-IA-01", "SS1", rgi2, p2[3]))

    # ── liens ──
    ids_ap = [i for n in NIV for i in aps[n]]
    L = []
    for n in NIV:
        v = ids_niveau[n]
        vers = v["co2"] + v["ir"] + v["ir_bur"] + v["temp"] + (["STORE-R3-01"] if n == "R3" else [])
        L.append(dict(id=f"LNK-LON-{n}", equipe="domotique", type="bus", protocole="lonworks_ftt10", de=f"AUT-IZOT-{n}", vers=vers))
    L.append(dict(id="LNK-LON-R3-POSTES", equipe="domotique", type="bus", protocole="lonworks_ftt10", de="AUT-IZOT-R3", vers=ids_niveau["R3"]["poste"], minimum_vital=False))
    L.append(dict(id="LNK-DALI-R3", equipe="domotique", type="bus", protocole="dali", de="AUT-IZOT-R3", vers=["ECL-R3-01"]))
    L.append(dict(id="LNK-MBUS-SS1", equipe="domotique", type="bus", protocole="mbus", de="GW-ISMA-SS1", vers=["CPT-ELEC-TGBT"] + [f"CPT-ELEC-{n}" for n in NIV] + ["CPT-CAL-SS1"]))
    L.append(dict(id="LNK-MODBUS-SS1", equipe="domotique", type="bus", protocole="modbus_rs485", de="GW-ISMA-SS1", vers=["REG-PAC-TT"]))
    L.append(dict(id="LNK-ETH-GTB", equipe="domotique", type="cable", protocole="ethernet", de="SRV-NIAGARA", vers=[f"AUT-IZOT-{n}" for n in NIV] + ["GW-ISMA-SS1", "ECR-R0-01"]))
    d_liens = L
    c_liens = [
        dict(id="LNK-NET-INTERNET-FW", equipe="cyber", type="flux_reseau", de="BOX-INTERNET", vers=["FW-01"], autorise_par_firewall=True),
        dict(id="LNK-NET-FW-BUR", equipe="cyber", type="cable", protocole="ethernet", de="FW-01", vers=["SW-BUR-01"], autorise_par_firewall=True),
        dict(id="LNK-NET-FW-GTB", equipe="cyber", type="cable", protocole="ethernet", de="FW-01", vers=["SW-GTB-01"], autorise_par_firewall=True),
        dict(id="LNK-NET-GTB-EQ", equipe="cyber", type="cable", protocole="ethernet", de="SW-GTB-01", vers=["SRV-NIAGARA", "GW-ISMA-SS1"]),
        dict(id="LNK-NET-BUR-AP", equipe="cyber", type="cable", protocole="ethernet", de="SW-BUR-01", vers=ids_ap),
        dict(id="LNK-FIBRE-DORSALE", equipe="cyber", type="fibre", protocole="fibre", de="BAIE-SS1-01", vers=[f"BAIE-{n}-01" for n in NIV]),
        dict(id="LNK-BLOQUE-WIFI-GTB", equipe="cyber", type="flux_reseau", de=aps["R1"][0], vers=["SRV-NIAGARA"], autorise_par_firewall=False),
        dict(id="LNK-NET-CAM", equipe="cyber", type="cable", protocole="ethernet", de="SW-BUR-01", vers=["CAM-R0-01", "BADGE-R0-01"], minimum_vital=False),
        dict(id="LNK-CLOUD", equipe="cyber", type="flux_reseau", de="SRV-NIAGARA", vers=["GW-CLOUD-01"], autorise_par_firewall=True, minimum_vital=False),
        dict(id="LNK-CLOUD-OUT", equipe="cyber", type="flux_reseau", de="GW-CLOUD-01", vers=["BOX-INTERNET"], autorise_par_firewall=True, minimum_vital=False),
    ]

    # ── gaines ──
    def pt(e):
        return [e["position"][0], e["position"][2]]
    par_id = {e["id"]: e for e in d_eq + c_eq + i_eq}
    G = []
    mont = pt(par_id["BAIE-R0-01"])
    G.append(dict(id="GAINE-SS1-DORSALE", equipe="cyber", nom="Dorsale fibre vers la montante (SS1)", type="horizontale", reseau="fibre",
                  chemin=[pt(par_id["BAIE-SS1-01"]), [mont[0], pt(par_id["BAIE-SS1-01"])[1]], mont], hauteur=3.25, niveau="SS1", contient=["LNK-FIBRE-DORSALE"]))
    g2 = pt(par_id["SW-GTB-01"])
    G.append(dict(id="GAINE-SS1-GTB", equipe="cyber", nom="Chemin de câbles GTB isolé (SS1)", type="horizontale", reseau="GTB",
                  chemin=[g2, pt(par_id["SRV-NIAGARA"]), pt(par_id["GW-ISMA-SS1"])], hauteur=2.7, niveau="SS1", contient=["LNK-NET-GTB-EQ"]))
    G.append(dict(id="MONT-01", equipe="cyber", nom="Montante technique (SS1 → R3)", type="montante", reseau="mixte", chemin=[mont], hauteur=3.0,
                  de="SS1", a="R3", contient=["LNK-FIBRE-DORSALE", "LNK-NET-BUR-AP"]))
    for n in NIV:
        pts = sorted([pt(par_id[i]) for i in aps[n]], key=lambda p: p[0])
        c0 = pt(par_id[f"BAIE-{n}-01"])
        zc = float(np.median([p[1] for p in pts]))
        G.append(dict(id=f"GAINE-{n}-BUR-O", equipe="cyber", nom=f"Chemin de câbles bureautique {n} (ouest)", type="horizontale", reseau="bureautique",
                      chemin=[c0, [c0[0], r2(zc)], [pts[0][0], r2(zc)]], hauteur=3.0, niveau=n, contient=["LNK-NET-BUR-AP"]))
        G.append(dict(id=f"GAINE-{n}-BUR-E", equipe="cyber", nom=f"Chemin de câbles bureautique {n} (est)", type="horizontale", reseau="bureautique",
                      chemin=[[c0[0], r2(zc)], [pts[-1][0], r2(zc)]], hauteur=3.0, niveau=n, contient=["LNK-NET-BUR-AP"]))
    h0 = hall["rect"]
    c0 = pt(par_id["BAIE-R0-01"])
    G.append(dict(id="GAINE-R0-HALL", equipe="cyber", nom="Chemin de câbles hall (caméra, badge)", type="horizontale", reseau="bureautique",
                  chemin=[c0, [c0[0], r2(h0[1] + 1.0)], pt(par_id["CAM-R0-01"]), pt(par_id["BADGE-R0-01"])], hauteur=3.0, niveau="R0", contient=["LNK-NET-CAM"]))

    # ── scénarios (textes adaptés) ──
    S = copy.deepcopy(cyb["scenarios"])
    ap1 = aps["R1"][0]
    for s in S:
        for e in s["etapes"]:
            if e["de"] == "AP-WIFI-R1-01": e["de"] = ap1
            if e["vers"] == "AP-WIFI-R1-01": e["vers"] = ap1
            e["texte"] = e["texte"].replace("la borne Wi-Fi de l'open space A", "la borne Wi-Fi du niveau 1").replace("Depuis le parking", "Depuis le parking visiteurs")
            e["texte"] = e["texte"].replace("la caméra du hall", "la caméra du hall d'accueil")
    # ── nœuds IA ──
    N = copy.deepcopy(ia["noeuds"])
    edge_tpl = {n["id"]: n for n in N}
    nouveaux = []
    for n in NIV:
        v = ids_niveau[n]
        base = copy.deepcopy(edge_tpl["IA-EDGE-R1"] if n != "R0" else edge_tpl["IA-EDGE-R0"])
        base["id"], base["heberge_sur"] = f"IA-EDGE-{n}", f"AUT-IZOT-{n}"
        base["entrees"] = v["co2"] + v["ir"] + v["temp"] + v["ir_bur"]
        if n not in ("R0",):
            base["modele"] = "Estimation d'occupation par zone (CO2 + IR) + régulation prédictive"
        if n != "R1":
            base.pop("preuves", None)
        nouveaux.append(base)
    central = copy.deepcopy(edge_tpl["IA-CENTRAL"])
    central["entrees"] = [i for n in NIV for k in ("co2", "ir", "temp", "ir_bur") for i in ids_niveau[n][k]]
    nouveaux.append(central)

    dom["equipements"], dom["liens"] = d_eq, d_liens
    cyb["equipements"], cyb["liens"], cyb["gaines"], cyb["scenarios"] = c_eq, c_liens, G, S
    ia["equipements"], ia["noeuds"] = i_eq, nouveaux
    return dom, cyb, ia, ops, bur2


def ecrire(nom, obj):
    (DATA / nom).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    theta, niveaux, pieces = lire_ifc(sys.argv[1])
    print(f"angle redressé : {theta:.2f}°  niveaux : {[n for n, _ in niveaux]}  pièces : {len(pieces)}")
    emprise, lvls, zones, asc = construire(theta, niveaux, pieces)
    plan = Plan(lvls, zones)
    dom, cyb, ia, ops, bur2 = equipements(plan)

    # preuves de référence rattachées à une zone de chaque famille (comme dans la maquette précédente)
    if ops:
        for z in zones:
            if z["id"] == ops[0]["id"]:
                z["preuves"] = ["PRV-DPO-01"]
    b1 = next((z for z in zones if z["type"] == "bureau" and z["niveau"] == "R1"), None)
    if b1:
        b1["preuves"] = ["PRV-DPO-01", "PRV-VERBATIM-SOPHIE"]
    sortie = []
    for z in zones:
        z = {k: v for k, v in z.items() if not k.startswith("_")}
        sortie.append(z)
    bat = dict(
        nom="Bâtiment N2 (modèle IFC de l'équipe Domotique)", emprise=emprise, modele=None, niveaux=lvls, zones=sortie, ascenseurs=asc,
    )
    ecrire("batiment.json", bat)
    ecrire("domotique.json", dom)
    ecrire("cyber.json", cyb)
    ecrire("ia.json", ia)
    c = collections.Counter(z["type"] for z in sortie)
    print("emprise", emprise, "zones", len(sortie), dict(c), "équipements", len(dom["equipements"]) + len(cyb["equipements"]) + len(ia["equipements"]))


if __name__ == "__main__":
    main()
