import Capacitor
import UIKit

/**
 * Registers app-local plugins with the Capacitor bridge.
 *
 * Capacitor's auto-registration only loads plugins listed in the generated
 * `capacitor.config.json` packageClassList (which `npx cap sync` rewrites for
 * npm plugins), so app-local plugins are registered explicitly here.
 *
 * This class is referenced from Main.storyboard (customClass="BridgeViewController").
 */
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(UpiPlugin())
    }
}
