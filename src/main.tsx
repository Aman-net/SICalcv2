import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import "./index.css"
import App from "./App"

// prompt-based SW update — user is notified, not force-reloaded
registerSW({
    onNeedRefresh() {
        window.location.reload()
    },
    onOfflineReady() {
        console.info("SICalc3 ready to work offline")
    },
})

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
