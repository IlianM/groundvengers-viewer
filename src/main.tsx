import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { installerPartage } from './partage'

// drei <Html> retire son élément du DOM au démontage d'un Canvas, après que React l'a déjà retiré : l'appel lève une
// exception sans conséquence mais bruyante (changement de qualité, comparaison). On ignore ce retrait redondant.
const retirer = Node.prototype.removeChild
Node.prototype.removeChild = function <T extends Node>(this: Node, enfant: T): T {
  return enfant.parentNode === this ? (retirer.call(this, enfant) as T) : enfant
}

installerPartage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
