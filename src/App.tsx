import { Scene3D } from './scene/Scene'
import { BarreHaut, PanneauGauche, FicheDetail, BandeauBas, Presentation, BandeauErreurs, OutilsCamera } from './ui/Panneaux'

export default function App() {
  return (
    <div className="app">
      <BarreHaut />
      <div className="corps">
        <PanneauGauche />
        <main className="viewer">
          <Scene3D />
          <OutilsCamera />
          <Presentation />
          <BandeauErreurs />
          <div className="mention-fictif">Entreprise, personnes et données fictives · maquette temporaire</div>
        </main>
        <FicheDetail />
      </div>
      <BandeauBas />
    </div>
  )
}
