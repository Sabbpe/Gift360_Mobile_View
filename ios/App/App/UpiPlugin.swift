import Capacitor
import UIKit

/**
 * App-local Capacitor plugin that exposes the only reliable way to know whether
 * a UPI app is installed on iOS: `UIApplication.shared.canOpenURL`.
 *
 * WKWebView/Safari cannot call canOpenURL, so installed-app detection must live
 * here. Every probed scheme MUST also be present in the app's Info.plist under
 * LSApplicationQueriesSchemes (tez, phonepe, paytmmp, credpay, bhim), otherwise
 * canOpenURL always returns false.
 *
 * NOTE: canOpenURL is a best-effort availability check. It does not guarantee
 * that the app can complete the payment.
 */
@objc(UpiPlugin)
public class UpiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UpiPlugin"
    public let jsName = "Upi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isInstalled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    /// isInstalled({ probe: "tez://" }) -> { installed: Bool }
    @objc func isInstalled(_ call: CAPPluginCall) {
        guard let probe = call.getString("probe"), let url = URL(string: probe) else {
            call.resolve(["installed": false])
            return
        }
        call.resolve(["installed": UIApplication.shared.canOpenURL(url)])
    }

    /// open({ url: "tez://upi/pay?..." }) -> resolves when the app was launched
    @objc func open(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw) else {
            call.reject("bad url")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("cannot open")
                }
            }
        }
    }
}
