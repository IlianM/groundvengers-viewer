import { useEtat } from './store'
import { Scene3D } from './scene/Scene'
import { Recherche } from './ui/Recherche'
import { BarreHaut, PanneauGauche, FicheDetail, BandeauBas, Presentation, BandeauErreurs, OutilsCamera, ZoneDepot, BarreSimulation } from './ui/Panneaux'

export default function App() {
  const r = useEtat((s) => s.reglages)
  return (
    <div className="app">
      <BarreHaut />
      <div className="corps">
        {r.panneauGauche && <PanneauGauche />}
        <ZoneDepot>
          <Scene3D />
          {r.recherche && <Recherche />}
          {r.boutonsCamera && <OutilsCamera />}
          <BarreSimulation />
          <Presentation />
          <BandeauErreurs />
          {r.mentionFictif && <div className="mention-fictif">Entreprise, personnes et données fictives · maquette temporaire</div>}
        </ZoneDepot>
        {r.panneauDroit && <FicheDetail />}
      </div>
      {r.bandeauBas && <BandeauBas />}
    </div>
  )
}
