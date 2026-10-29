/* ===== باقات الأسعار الرسمية — مصدر الحقيقة الوحيد للـ AI =====
   ⚠️ عدّل الأرقام من هنا فقط. أي تغيير هنا يتطبق فورًا على الشات بوت والبلانر. */
window.PRICING = {
  currency: "USD",
  plans: [
    {
      id: "starter",
      name: "STARTER",
      color: "#fbbf24",
      range: { min: 15, max: 30 },
      tagline: "Simple apps — short timeline",
      bestFor: "Best for simple utility or personal apps. Clean UI; on-time delivery; source code included.",
      included: [
        "Up to 5 screens",
        "Firebase Auth (login/register)",
        "Provider state management",
        "GitHub source code delivery",
        "1 round of revisions"
      ],
      excluded: ["Firestore / real-time DB", "Store deployment"],
      cta: "Get Started"
    },
    {
      id: "standard",
      name: "STANDARD",
      color: "#34d399",
      popular: true,
      range: { min: 35, max: 70 },
      tagline: "E-commerce & dashboards — mid complexity",
      bestFor: "Ideal for e-commerce, dashboards, or productivity apps with real-time data and clean architecture.",
      included: [
        "Up to 12 screens",
        "Firebase Auth + Firestore",
        "Provider or BLoC",
        "Real-time product/order data",
        "Custom UI (Figma-based)",
        "2 rounds of revisions",
        "Android + iOS build"
      ],
      excluded: ["Store deployment"],
      cta: "Hire Me"
    },
    {
      id: "pro",
      name: "PRO",
      color: "#22d3ee",
      range: { min: 75, max: 100 },
      tagline: "Full production apps — startup & launches",
      bestFor: "Full production-ready app — multi-feature, optimized, deployed. Ideal for startups & launches.",
      included: [
        "Unlimited screens",
        "Full Firebase integration",
        "BLoC architecture",
        "Performance-optimized code",
        "Push Notifications setup",
        "Store submission",
        "3 rounds of revisions"
      ],
      excluded: [],
      cta: "Get Started"
    }
  ],
  get contact() { return window.PORTFOLIO_CONTACT; },
  lastUpdated: "2026-10-25",
  notes: [
    "السعر النهائي بيتحدد حسب نطاق المشروع بعد استشارة مجانية",
    "الاستشارة الأولى (15 دقيقة) مجانًا",
    "خصومات للمشاريع طويلة المدى والعملاء المتكررين"
  ]
};
