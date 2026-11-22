import { useEtat } from './store'
import { Scene3D } from './scene/Scene'
import { Comparaison } from './ui/Comparaison'
import { Recherche } from './ui/Recherche'
import { BarreHaut, PanneauGauche, FicheDetail, BandeauBas, Presentation, BandeauErreurs, OutilsCamera, ZoneDepot, BarreSimulation, BandeauConfigPartagee } from './ui/Panneaux'

export default function App() {
  const r = useEtat((s) => s.reglages)
  const comparaison = useEtat((s) => s.comparaison)
  return (
    <div className="app">
      <BarreHaut />
      <div className="corps">
        {r.panneauGauche && <PanneauGauche />}
        <ZoneDepot>
          {comparaison ? <Comparaison /> : <Scene3D />}
          {r.recherche && <Recherche />}
          {r.boutonsCamera && <OutilsCamera />}
          <BarreSimulation />
          <Presentation />
          <BandeauErreurs />
          <BandeauConfigPartagee />
          {r.mentionFictif && <div className="mention-fictif">Entreprise, personnes et données fictives · maquette temporaire</div>}
        </ZoneDepot>
        {r.panneauDroit && <FicheDetail />}
      </div>
      {r.bandeauBas && <BandeauBas />}
    </div>
  )
}
