import { Scene3D } from './scene/Scene'
import { Recherche } from './ui/Recherche'
import { BarreHaut, PanneauGauche, FicheDetail, BandeauBas, Presentation, BandeauErreurs, OutilsCamera, ZoneDepot } from './ui/Panneaux'

export default function App() {
  return (
    <div className="app">
      <BarreHaut />
      <div className="corps">
        <PanneauGauche />
        <ZoneDepot>
          <Scene3D />
          <Recherche />
          <OutilsCamera />
          <Presentation />
          <BandeauErreurs />
          <div className="mention-fictif">Entreprise, personnes et données fictives · maquette temporaire</div>
        </ZoneDepot>
        <FicheDetail />
      </div>
      <BandeauBas />
    </div>
  )
}
