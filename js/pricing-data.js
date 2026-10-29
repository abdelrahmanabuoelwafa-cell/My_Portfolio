/* ===== PRICING JSON v2 — Single Source of Truth =====
   Calibrated: 2026-10-29 against actual global market data (Fiverr, Upwork, Freelancer, Mostaql, Khamsat).
   All prices throughout portfolio, AI assistant, and planner are dynamically referenced from this object. */
(function() {
  var pricingData = {
    "version": "2.0",
    "calibratedOn": "2026-10-29",
    "currency": "USD",
    "fxRateEgp": 48,
    "tiers": [
      {
        "id": "starter",
        "name": "Starter",
        "price": [60, 120],
        "popular": false,
        "for": "Simple tools or personal apps",
        "for_ar": "أدوات بسيطة أو تطبيقات شخصية",
        "includes": ["Up to 5 screens", "Firebase Auth (login/register)", "Provider state management", "Source code on GitHub", "1 revision round"],
        "includes_ar": ["حتى 5 شاشات", "تسجيل دخول بـ Firebase", "إدارة حالة Provider", "تسليم الكود على GitHub", "1 جولة تعديلات"],
        "excludes_ar": ["قاعدة بيانات لحظية", "رفع على المتاجر"],
        "marketComparison": "Market typically: $120–360 on Fiverr",
        "marketComparison_ar": "السوق عادةً: $120–360 على Fiverr"
      },
      {
        "id": "standard",
        "name": "Standard",
        "price": [180, 400],
        "popular": true,
        "for": "Medium-complexity apps (stores, dashboards)",
        "for_ar": "تطبيقات متوسطة التعقيد (متاجر، لوحات)",
        "includes": ["Up to 12 screens", "Firebase Auth + Firestore", "Provider or BLoC", "Realtime data", "Custom UI on Figma", "2 revision rounds", "Android + iOS builds"],
        "includes_ar": ["حتى 12 شاشة", "Firebase Auth + Firestore", "Provider أو BLoC", "بيانات لحظية", "تصميم UI على Figma", "2 جولات تعديلات", "بناء لـ Android و iOS"],
        "excludes_ar": ["رفع على المتاجر"],
        "marketComparison": "Market typically: $480–1,200 on Fiverr & Upwork",
        "marketComparison_ar": "السوق عادةً: $480–1,200 على Fiverr وUpwork"
      },
      {
        "id": "pro",
        "name": "Pro",
        "price": [550, 1200],
        "popular": false,
        "for": "Startups and full production launches",
        "for_ar": "مشاريع احترافية وإطلاقات رسمية",
        "includes": ["Unlimited screens", "Full Firebase integration", "BLoC architecture", "Performance-optimized code", "Push notifications", "App store submission", "3 revision rounds"],
        "includes_ar": ["شاشات غير محدودة", "تكامل Firebase كامل", "معمارية BLoC", "كود محسّن للأداء", "إشعارات Push", "رفع على المتاجر", "3 جولات تعديلات"],
        "marketComparison": "Market typically: $1,450+ on Fiverr, $1,500+ with Egyptian agencies",
        "marketComparison_ar": "السوق عادةً: $1,450+ على Fiverr و$1,500+ في وكالات مصر"
      }
    ],
    "addOns": {
      "extraRevision": 15,
      "sourceCodePackage": 30,
      "webBuild": 40,
      "rushDelivery": "25% of project price",
      "rushDelivery_ar": "25% من سعر المشروع"
    },
    "rules": {
      "floor": 50,
      "humanReviewCeiling": 1500,
      "noAutoSend": true,
      "finalPriceAfterHumanReview": true
    }
  };

  // Backward-compatibility alias for legacy code referencing PRICING.plans
  pricingData.plans = pricingData.tiers;

  if (typeof window !== 'undefined') {
    window.PRICING = pricingData;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pricingData;
  }
})();
