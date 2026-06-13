// Subscription management — RevenueCat for native, localStorage fallback for web

const PRO_KEY = "wholefed_pro";
const RC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || "";
const ENTITLEMENT_ID = "Wholefed Pro";

function isNative() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
}

let rcInitialized = false;

// Initialize RevenueCat (call once on app start)
export async function initSubscriptions(userId) {
  if (!isNative() || !RC_API_KEY || rcInitialized) return;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.configure({
      apiKey: RC_API_KEY,
      appUserID: userId || null,
    });
    rcInitialized = true;
  } catch (err) {
    console.warn("RevenueCat init failed:", err);
  }
}

// Check if user has pro access
export async function hasAccess() {
  if (typeof window === "undefined") return false;

  // Promo-granted access is permanent — honored first so RevenueCat never overwrites it.
  if (localStorage.getItem("wholefed_promo_pro") === "true") return true;

  if (isNative() && rcInitialized) {
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const result = await Purchases.getCustomerInfo();
      const customerInfo = result.customerInfo || result;
      const hasEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      localStorage.setItem(PRO_KEY, hasEntitlement ? "true" : "false");
      return hasEntitlement;
    } catch {}
  }

  return localStorage.getItem(PRO_KEY) === "true";
}

function pickCurrentOffering(result) {
  if (!result) return null;
  if (result.current) return result.current;
  if (result.offerings?.current) return result.offerings.current;
  return null;
}

// Get available packages for purchase
export async function getOfferings() {
  if (!isNative() || !rcInitialized) return null;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.getOfferings();
    return pickCurrentOffering(result);
  } catch {
    return null;
  }
}

// Purchase the pro subscription
export async function purchasePro() {
  if (!isNative() || !rcInitialized) {
    // Web — no purchase available, must use native app
    return { success: false, error: "Subscriptions are only available in the iOS app." };
  }

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.getOfferings();
    const current = pickCurrentOffering(result);
    const pkg = current?.monthly || current?.availablePackages?.[0];

    if (!pkg) return { success: false, error: "No package available" };

    const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });
    const customerInfo = purchaseResult.customerInfo || purchaseResult;
    const hasEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    localStorage.setItem(PRO_KEY, hasEntitlement ? "true" : "false");
    return { success: hasEntitlement };
  } catch (err) {
    if (err.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: err.message };
  }
}

// Restore previous purchases
export async function restorePurchases() {
  if (!isNative() || !rcInitialized) {
    return { success: false, error: "Only available on iOS" };
  }

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.restorePurchases();
    const customerInfo = result.customerInfo || result;
    const hasEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    localStorage.setItem(PRO_KEY, hasEntitlement ? "true" : "false");
    return { success: hasEntitlement };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
