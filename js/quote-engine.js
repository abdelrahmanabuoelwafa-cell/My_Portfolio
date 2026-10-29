/* ===== Quote Engine — Pure Estimation Engine based on Frozen Market Data =====
   Calibrated: 2026-10-29. Zero DOM dependency. Strict mathematical formula. */
(function() {
  const QUOTE_CONFIG = {
    base: 60,                          // أرضية أي مشروع
    perScreenExtra: 15,                // بعد أول 3 شاشات
    features: {
      firebaseAuth: 15, firestoreRealtime: 25, restApi: 20,
      payments: 45, pushNotifications: 20, adminPanel: 55,
      mapsGps: 35, chatMessaging: 45, figmaCustomUI: 25,
      storeSubmission: 35, localizationArEn: 15, offlineMode: 20,
      chartsAnalytics: 20, adsIntegration: 15
    },
    complexityMultiplier: { simple: 1.0, medium: 1.15, complex: 1.35 },
    confidenceBand: 0.25,              // النطاق ±25%
    floor: 50, humanReviewCeiling: 1500, roundTo: 5
  };

  function estimateQuote(input) {
    input = input || {};
    // input: { screens, features: [], complexity }
    const screens = Math.max(1, input.screens || 3);
    let price = QUOTE_CONFIG.base + Math.max(0, screens - 3) * QUOTE_CONFIG.perScreenExtra;
    (input.features || []).forEach(f => { price += QUOTE_CONFIG.features[f] || 0; });
    price *= QUOTE_CONFIG.complexityMultiplier[input.complexity] || 1;
    const r = v => Math.round(v / QUOTE_CONFIG.roundTo) * QUOTE_CONFIG.roundTo;
    price = Math.max(QUOTE_CONFIG.floor, r(price));
    return {
      estimate: price,
      range: [r(price * (1 - QUOTE_CONFIG.confidenceBand)), r(price * (1 + QUOTE_CONFIG.confidenceBand))],
      exceedsCeiling: price > QUOTE_CONFIG.humanReviewCeiling
    };
  }

  if (typeof window !== 'undefined') {
    window.QUOTE_CONFIG = QUOTE_CONFIG;
    window.estimateQuote = estimateQuote;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QUOTE_CONFIG, estimateQuote };
  }
})();
