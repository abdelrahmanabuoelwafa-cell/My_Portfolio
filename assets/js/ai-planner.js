/* ============================================================
   AI Business Planner â€” High-Converting Client Roadmap & Estimator
   - Groq AI / Google Gemini via Cloudflare AI Worker & Direct Fallback
   - Structured 5-Section Client-Focused Output
   - Real Delivery Flow & Milestones Schedule (Actual delivery moments)
   - Dynamic Budget Estimation with Real-Time Currency Switcher (EGP, SAR, AED, USD)
   - Budget Tier Selection with Click-to-Approve
   - Dedicated Section for Future Enhancements
   - English by default with full Arabic support
   ============================================================ */
(function () {
  'use strict';

  var AI_ENDPOINT = window.PORTFOLIO_AI_ENDPOINT || null;
  var MAX_IDEA = 2500;

  var PREFILL = {
    en: '1) Executive Blueprint & Core Value Proposition\n2) Core MVP Deliverables & Feature Scope\n3) Real Delivery Flow & Milestones Schedule\n4) Investment Estimation & Budget Breakdown\n5) Recommended Future Enhancements & Add-ons\n',
    ar: '1) Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©\n2) Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ MVP ÙˆÙ†Ø·Ø§Ù‚ Ø§Ù„ØªØ³Ù„ÙŠÙ…\n3) Ù…Ø±Ø§Ø­Ù„ Ø§Ù„ØªÙ†ÙÙŠØ° ÙˆØ§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠ Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„ØªØ³Ù„ÙŠÙ…\n4) Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠØ© ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ©\n5) ØªØ­Ø³ÙŠÙ†Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ© Ù…Ù‚ØªØ±Ø­Ø© ÙˆØªÙˆØ³Ø¹Ø§Øª Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠØ©\n'
  };

  var PREFILL_NOTE = {
    en: '\nIMPORTANT: Output exactly these 5 numbered sections. Section 3: week-by-week delivery with client handoff moments. Section 4: clear cost in selected currency with recommended package. Section 5: 3-4 high-ROI future upgrades. Be convincing and client-centric.',
    ar: '\nÙ‡Ø§Ù…: Ø§ÙƒØªØ¨ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… Ø§Ù„Ø®Ù…Ø³Ø© Ø§Ù„Ù…Ø±Ù‚Ù…Ø© Ø¨Ø¯Ù‚Ø©. Ø§Ù„Ù‚Ø³Ù… 3: Ø¬Ø¯ÙˆÙ„ Ø£Ø³Ø¨ÙˆØ¹ÙŠ ÙˆØ§Ø¶Ø­ Ù…Ø¹ Ù…ÙˆØ§Ø¹ÙŠØ¯ ØªØ³Ù„ÙŠÙ… Ø§Ù„Ø¹Ù…ÙŠÙ„. Ø§Ù„Ù‚Ø³Ù… 4: Ø³Ø¹Ø± ÙˆØ§Ø¶Ø­ Ø¨Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ø¹ Ø§Ø³Ù… Ø§Ù„Ø¨Ø§Ù‚Ø©. Ø§Ù„Ù‚Ø³Ù… 5: 3-4 Ø¥Ø¶Ø§ÙØ§Øª Ø°ÙƒÙŠØ© Ù„Ù„Ù…Ø³ØªÙ‚Ø¨Ù„. Ø£Ø³Ù„ÙˆØ¨ Ù…Ù‚Ù†Ø¹ ÙˆØ§Ø­ØªØ±Ø§ÙÙŠ.'
  };

  var CURRENCY_RATES = {
    USD: { symbol: '$',    rate: 1.0,   code: 'USD' },
    EGP: { symbol: 'Ø¬.Ù…', rate: 50.0,  code: 'EGP' },
    SAR: { symbol: 'Ø±.Ø³', rate: 3.75,  code: 'SAR' },
    AED: { symbol: 'Ø¯.Ø¥', rate: 3.67,  code: 'AED' }
  };

  var selectedBudgetTier = { id: 'standard', name: 'STANDARD', price: '' };

  var form       = document.getElementById('planner-form');
  if (!form) return;

  var ideaEl     = document.getElementById('planner-idea');
  var audEl      = document.getElementById('planner-audience');
  var featEl     = document.getElementById('planner-features');
  var currEl     = document.getElementById('planner-currency');
  var deadlineEl = document.getElementById('planner-deadline');
  var btn        = document.getElementById('planner-btn');
  var emptyEl    = document.getElementById('planner-empty');
  var loadingEl  = document.getElementById('planner-loading');
  var errorEl    = document.getElementById('planner-error');
  var bodyEl     = document.getElementById('planner-body');
  var previewEl  = document.getElementById('planner-preview');
  var chips      = Array.prototype.slice.call(document.querySelectorAll('#planner-platform .pf-chip'));
  var currencyChips = Array.prototype.slice.call(document.querySelectorAll('#planner-currency-chips .pf-chip'));

  var currentSelectedCurrency = 'USD';
  var lastGeneratedPlan = '';

  var STR = {
    en: {
      topBadge: 'Instant Client Roadmap & Budget Estimator â€” Free',
      mainTitle: 'AI Project Blueprint & Cost Planner',
      mainSubtitle: 'Transform your app idea into a high-converting, production-ready roadmap with realistic delivery milestones, transparent budget estimation in your local currency, and tailored feature architecture.',
      badge: 'AI Engine Online â€” Architecture & Sprint Planning Ready',
      ideaLabel: 'Project Idea & Business Vision *',
      ideaPh: 'Describe your app concept, the core problem it solves, and your main business goal...',
      audLabel: 'Target Audience & Market (Optional)',
      audPh: 'e.g. Healthcare clinics, e-commerce shoppers, college students...',
      platLabel: 'Target Platform',
      platMobile: 'Mobile (iOS + Android)',
      platWeb: 'Web',
      platDesktop: 'Desktop',
      platUniversal: 'Cross-Platform',
      featLabel: 'Key Features & Modules (Optional)',
      featPh: 'e.g. User login, payment gateway, real-time chat, push notifications, Google Maps...',
      currencyLabel: 'Preferred Currency & Country',
      deadlineLabel: 'Estimated Delivery Expectation',
      dlMvp: 'Fast MVP (2-3 Weeks)',
      dlStandard: 'Standard Production (3-5 Weeks)',
      dlEnterprise: 'Full Scale Launch (6-8 Weeks)',
      dlFlexible: 'Flexible / Milestone Based',
      generate: 'Generate Client Roadmap & Estimate',
      generating: 'Architecting Roadmap...',
      note: 'Clear, structured guidance. Final timeline, deliverables, and exact quote are finalized during your free consultation.',
      empty: 'Ready to build your client-grade project plan? Fill in your project idea above and generate a structured 5-section executive blueprint.',
      loadingTitle: 'Architecting Your Project Roadmap...',
      loading: 'Analyzing features, structuring sprints, and computing budget...',
      errIdea: 'Please describe your project idea first.',
      errNetwork: 'Could not reach the AI service. Please check your connection and try again.',
      errConfig: 'AI service endpoint is not configured.',
      errTimeout: 'The AI took too long to respond. Please try again.',
      errGeneric: 'Something went wrong while generating the plan. Please try again.',
      approveBtn: 'Approve Plan & Message on WhatsApp',
      askBtn: 'Ask AI a Question about this Plan',
      regenBtn: 'Regenerate Plan',
      namePh: 'Your Name (Optional)',
      contactPh: 'WhatsApp or Email for follow-up',
      askPh: 'Ask any question about this plan...',
      sendQuestion: 'Send Question',
      asking: 'Consulting AI...',
      successMsg: 'Roadmap approved! Opening WhatsApp to connect with Abdelrahman...',
      currSwitcherLabel: 'Switch Currency:',
      tierSelectHint: 'Click a package below to select it for approval',
      tierSelected: 'Selected'
    },
    ar: {
      topBadge: 'Ø®Ø·Ø© Ø¹Ù…Ù„ Ø¨Ø±Ù…Ø¬ÙŠØ© ÙˆÙ…ÙŠØ²Ø§Ù†ÙŠØ© ØªÙ‚Ø¯ÙŠØ±ÙŠØ© Ù„Ù„Ø¹Ù…ÙŠÙ„ â€” Ù…Ø¬Ø§Ù†Ø§',
      mainTitle: 'Ù…Ø®Ø·Ø· Ù…Ø´Ø±ÙˆØ¹Ùƒ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ ÙˆØªÙ‚Ø¯ÙŠØ± Ø§Ù„ØªÙƒÙ„ÙØ© Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ',
      mainSubtitle: 'Ø­ÙˆÙ„ ÙÙƒØ±Ø© ØªØ·Ø¨ÙŠÙ‚Ùƒ Ø¥Ù„Ù‰ Ø®Ø·Ø© ØªÙ†ÙÙŠØ° ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…Ù‚Ù†Ø¹Ø© Ù…Ø¹ Ù…Ø±Ø§Ø­Ù„ Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„ÙØ¹Ù„ÙŠØ©ØŒ Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ‚Ø±ÙŠØ¨ÙŠØ© Ø¨Ø¹Ù…Ù„ØªÙƒ Ø§Ù„Ù…Ø­Ù„ÙŠØ©ØŒ ÙˆØ§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ© Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠØ© Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©.',
      badge: 'Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ù…ØªØµÙ„ â€” Ø¬Ø§Ù‡Ø² Ù„ØªØ®Ø·ÙŠØ· Ù…Ø±Ø§Ø­Ù„ Ø§Ù„ØªÙ†ÙÙŠØ° ÙˆØ§Ù„ØªÙƒÙ„ÙØ©',
      ideaLabel: 'ÙÙƒØ±Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ§Ù„Ù‡Ø¯Ù Ù…Ù†Ù‡ *',
      ideaPh: 'Ø§ÙˆØµÙ ÙÙƒØ±Ø© ØªØ·Ø¨ÙŠÙ‚ÙƒØŒ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø§Ù„ØªÙŠ ÙŠØ­Ù„Ù‡Ø§ØŒ ÙˆØ§Ù„Ù‡Ø¯Ù Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ù„Ù…Ø´Ø±ÙˆØ¹Ùƒ...',
      audLabel: 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù ÙˆØ§Ù„Ø³ÙˆÙ‚ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)',
      audPh: 'Ù…Ø«Ø§Ù„: Ø¹ÙŠØ§Ø¯Ø§Øª Ø·Ø¨ÙŠØ©ØŒ Ù…ØªØ³ÙˆÙ‚ÙˆÙ† Ø¹Ø¨Ø± Ø§Ù„Ø¥Ù†ØªØ±Ù†ØªØŒ Ø·Ù„Ø§Ø¨ Ø¬Ø§Ù…Ø¹Ø§Øª...',
      platLabel: 'Ø§Ù„Ù…Ù†ØµØ© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©',
      platMobile: 'Ù…ÙˆØ¨Ø§ÙŠÙ„ (Ø£Ù†Ø¯Ø±ÙˆÙŠØ¯ + Ø¢ÙŠÙÙˆÙ†)',
      platWeb: 'ÙˆÙŠØ¨',
      platDesktop: 'Ø³Ø·Ø­ Ø§Ù„Ù…ÙƒØªØ¨',
      platUniversal: 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ù†ØµØ§Øª',
      featLabel: 'Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)',
      featPh: 'Ù…Ø«Ø§Ù„: ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ØŒ Ø¯ÙØ¹ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØŒ Ø´Ø§Øª ÙÙˆØ±ÙŠØŒ Ø¥Ø´Ø¹Ø§Ø±Ø§ØªØŒ Ø®Ø±Ø§Ø¦Ø· Ø¬ÙˆØ¬Ù„...',
      currencyLabel: 'Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ù…ÙØ¶Ù„Ø© / Ø§Ù„Ø¨Ù„Ø¯',
      deadlineLabel: 'Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ø²Ù…Ù†ÙŠØ© Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø© Ù„Ù„ØªØ³Ù„ÙŠÙ…',
      dlMvp: 'Ù†Ø³Ø®Ø© Ø£ÙˆÙ„ÙŠØ© Ø³Ø±ÙŠØ¹Ø© (2 Ø¥Ù„Ù‰ 3 Ø£Ø³Ø§Ø¨ÙŠØ¹)',
      dlStandard: 'Ø¥Ø·Ù„Ø§Ù‚ Ù‚ÙŠØ§Ø³ÙŠ Ù…ØªÙƒØ§Ù…Ù„ (3 Ø¥Ù„Ù‰ 5 Ø£Ø³Ø§Ø¨ÙŠØ¹)',
      dlEnterprise: 'Ù…Ø´Ø±ÙˆØ¹ ÙƒØ¨ÙŠØ± ÙˆÙ…ÙˆØ³Ø¹ (6 Ø¥Ù„Ù‰ 8 Ø£Ø³Ø§Ø¨ÙŠØ¹)',
      dlFlexible: 'Ù…Ø±Ù† / Ø­Ø³Ø¨ Ù…Ø±Ø§Ø­Ù„ Ø§Ù„Ø§ØªÙØ§Ù‚',
      generate: 'Ø£Ù†Ø´Ø¦ Ø®Ø·Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØªÙ‚Ø¯ÙŠØ± Ø§Ù„ØªÙƒÙ„ÙØ©',
      generating: 'Ø¬Ø§Ø±ÙŠ Ù‡Ù†Ø¯Ø³Ø© Ø®Ø·Ø© Ø§Ù„ØªÙ†ÙÙŠØ°...',
      note: 'ØªÙ‚Ø¯ÙŠØ±Ø§Øª ØªØ®Ø·ÙŠØ·ÙŠØ© Ø£ÙˆÙ„ÙŠØ© ÙˆØ§Ø¶Ø­Ø©. ÙŠØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ ÙˆØ§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø© Ø¨Ø¹Ø¯ Ø§Ø³ØªØ´Ø§Ø±Ø© Ù…Ø¬Ø§Ù†ÙŠØ©.',
      empty: 'Ø¬Ø§Ù‡Ø² Ù„Ø¨Ù†Ø§Ø¡ Ø®Ø·Ø© Ù…Ø´Ø±ÙˆØ¹Ùƒ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠØŸ Ø§ÙƒØªØ¨ ÙÙƒØ±Ø© Ù…Ø´Ø±ÙˆØ¹Ùƒ Ø¨Ø§Ù„Ø£Ø¹Ù„Ù‰ Ù„ØªÙˆÙ„ÙŠØ¯ Ø®Ø·Ø© ØªÙ†ÙÙŠØ°ÙŠØ© Ù…Ù†Ø¸Ù…Ø© Ù…Ù† 5 Ø£Ù‚Ø³Ø§Ù….',
      loadingTitle: 'Ø¬Ø§Ø±ÙŠ Ù‡Ù†Ø¯Ø³Ø© ÙˆØªØ®Ø·ÙŠØ· Ù…Ø´Ø±ÙˆØ¹Ùƒ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ...',
      loading: 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…ØªØ·Ù„Ø¨Ø§ØªØŒ Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ù…Ø±Ø§Ø­Ù„ Ø¨Ø§Ù„Ø£Ø³Ø§Ø¨ÙŠØ¹ØŒ ÙˆØ­Ø³Ø§Ø¨ Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠØ©...',
      errIdea: 'Ù…Ù† ÙØ¶Ù„Ùƒ Ø§ÙƒØªØ¨ ÙÙƒØ±Ø© Ù…Ø´Ø±ÙˆØ¹Ùƒ Ø£ÙˆÙ„Ø§.',
      errNetwork: 'ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø®Ø¯Ù…Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ. ØªØ­Ù‚Ù‚ Ù…Ù† Ø§ØªØµØ§Ù„Ùƒ ÙˆØ­Ø§ÙˆÙ„ Ø«Ø§Ù†ÙŠØ©.',
      errConfig: 'Ø®Ø¯Ù…Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ØºÙŠØ± Ù…ØªØµÙ„Ø©.',
      errTimeout: 'Ø§Ø³ØªØºØ±Ù‚ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ÙˆÙ‚ØªØ§ Ø·ÙˆÙŠÙ„Ø§. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.',
      errGeneric: 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø®Ø·Ø©. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.',
      approveBtn: 'ÙˆØ§ÙÙ‚Øª Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø·Ø© â€” Ø§Ø¨Ø¯Ø£ Ø¹Ù„Ù‰ ÙˆØ§ØªØ³Ø§Ø¨',
      askBtn: 'Ø§Ø³Ø£Ù„ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø¹Ù† Ø§Ù„Ø®Ø·Ø©',
      regenBtn: 'ÙˆÙ„Ø¯ Ø®Ø·Ø© Ø¬Ø¯ÙŠØ¯Ø©',
      namePh: 'Ø§Ø³Ù…Ùƒ Ø§Ù„ÙƒØ±ÙŠÙ… (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)',
      contactPh: 'Ø±Ù‚Ù… ÙˆØ§ØªØ³Ø§Ø¨ Ø£Ùˆ Ø¥ÙŠÙ…ÙŠÙ„Ùƒ Ù„Ù„ØªÙˆØ§ØµÙ„',
      askPh: 'Ø§Ø³Ø£Ù„ Ø£ÙŠ Ø§Ø³ØªÙØ³Ø§Ø± Ø¹Ù† Ø§Ù„Ø®Ø·Ø©...',
      sendQuestion: 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø³Ø¤Ø§Ù„',
      asking: 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙÙƒÙŠØ±...',
      successMsg: 'ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø·Ø©! Ø¬Ø§Ø±ÙŠ ÙØªØ­ ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„ØªÙˆØ§ØµÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…Ø¹ Ø¹Ø¨Ø¯ Ø§Ù„Ø±Ø­Ù…Ù†...',
      currSwitcherLabel: 'Ø§Ø®ØªØ± Ø¹Ù…Ù„Ø© Ø§Ù„Ø¹Ø±Ø¶:',
      tierSelectHint: 'Ø§Ø¶ØºØ· Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ø§Ù‚Ø© Ù„Ø§Ø®ØªÙŠØ§Ø±Ù‡Ø§ ÙˆØ¥Ø±Ø³Ø§Ù„Ù‡Ø§ Ù„Ù„Ù…ÙˆØ§ÙÙ‚Ø©',
      tierSelected: 'ØªÙ… Ø§Ù„Ø§Ø®ØªÙŠØ§Ø±'
    }
  };

  function lang() {
    var l = document.documentElement.getAttribute('lang') || 'en';
    return (l === 'ar' || l === 'en') ? l : 'en';
  }

  function t(key) {
    var dict = STR[lang()] || STR.en;
    return dict[key] !== undefined ? dict[key] : (STR.en[key] || '');
  }

  function applyStrings() {
    document.querySelectorAll('[data-pf]').forEach(function (el) {
      var k = el.getAttribute('data-pf');
      if (k && STR[lang()] && STR[lang()][k]) el.textContent = STR[lang()][k];
    });
    if (ideaEl) ideaEl.placeholder = t('ideaPh');
    if (audEl)  audEl.placeholder  = t('audPh');
    if (featEl) featEl.placeholder = t('featPh');
    if (btn && !btn.disabled) {
      var span = btn.querySelector('span');
      if (span) span.textContent = t('generate');
      else btn.textContent = t('generate');
    }
    var isAr = lang() === 'ar';
    var currLabels = {
      USD: isAr ? 'Ø¯ÙˆÙ„Ø§Ø± USD' : 'USD ($)',
      EGP: isAr ? 'Ø¬Ù†ÙŠÙ‡ EGP' : 'EGP (Ø¬.Ù…)',
      SAR: isAr ? 'Ø±ÙŠØ§Ù„ SAR' : 'SAR (Ø±.Ø³)',
      AED: isAr ? 'Ø¯Ø±Ù‡Ù… AED' : 'AED (Ø¯.Ø¥)'
    };
    currencyChips.forEach(function (chip) {
      var code = chip.getAttribute('data-curr');
      if (code && currLabels[code]) chip.textContent = currLabels[code];
    });
  }

  window.__plannerI18n = applyStrings;
  applyStrings();

  function showState(which) {
    if (emptyEl)   emptyEl.hidden   = which !== 'empty';
    if (loadingEl) loadingEl.hidden = which !== 'loading';
    if (errorEl)   errorEl.hidden   = which !== 'error';
    if (bodyEl)    bodyEl.hidden    = which !== 'body';
    if (previewEl) previewEl.hidden = which !== 'preview';
  }

  function showError(msg) {
    if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; }
    showState('error');
    setBusy(false);
  }

  function setBusy(on) {
    if (!btn) return;
    btn.disabled = on;
    var span = btn.querySelector('span');
    if (span) span.textContent = on ? t('generating') : t('generate');
  }

  // Platform chips
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (o) { o.classList.remove('on'); o.setAttribute('aria-pressed', 'false'); });
      c.classList.add('on');
      c.setAttribute('aria-pressed', 'true');
    });
  });

  function platforms() {
    var sel = chips.find(function (c) { return c.classList.contains('on'); });
    return sel ? sel.getAttribute('data-v') : 'Mobile app (iOS & Android via Flutter)';
  }

  // Currency chips â€” form level
  function activateCurrencyChip(code) {
    currentSelectedCurrency = code;
    if (currEl) currEl.value = code;
    currencyChips.forEach(function (chip) {
      var active = chip.getAttribute('data-curr') === code;
      chip.classList.toggle('on', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (bodyEl && !bodyEl.hidden) updateBudgetCardAmounts(code);
  }

  currencyChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var code = chip.getAttribute('data-curr');
      if (code) activateCurrencyChip(code);
    });
  });
  activateCurrencyChip('USD');

  function buildUserMessage() {
    var isAr = lang() === 'ar';
    var L = [];
    var currency = currentSelectedCurrency || 'USD';
    L.push(isAr ? 'ÙÙƒØ±Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹:' : 'Project Idea:');
    L.push((ideaEl && ideaEl.value.trim()) || '');
    var aud = audEl && audEl.value.trim();
    if (aud) { L.push(isAr ? 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù:' : 'Target Audience:'); L.push(aud); }
    L.push(isAr ? 'Ø§Ù„Ù…Ù†ØµØ©:' : 'Platform:');
    L.push(platforms());
    var feats = featEl && featEl.value.trim();
    if (feats) { L.push(isAr ? 'Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:' : 'Requested Features:'); L.push(feats); }
    L.push(isAr ? 'Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© Ù„Ù„ØªØ³Ø¹ÙŠØ±:' : 'Preferred Currency:');
    L.push(currency + ' (' + (CURRENCY_RATES[currency] ? CURRENCY_RATES[currency].symbol : '$') + ')');
    if (deadlineEl && deadlineEl.value) {
      L.push(isAr ? 'Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹:' : 'Timeline:');
      L.push(deadlineEl.options[deadlineEl.selectedIndex].text);
    }
    L.push(isAr ? 'Ø£Ø®Ø±Ø¬ Ø§Ù„Ø®Ø·Ø© ÙƒØ§Ù…Ù„Ø© ÙˆÙÙ‚ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… Ø§Ù„Ø®Ù…Ø³Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© ÙÙ‚Ø·.' : 'Produce the full plan using strictly the 5 required sections.');
    return L.join('\n');
  }

  function callGeminiDirect(promptText, systemPromptText) {
    var key = window.PORTFOLIO_GEMINI_KEY;
    if (!key) return Promise.reject(new Error('No Gemini API key'));
    var model = window.PORTFOLIO_GEMINI_MODEL || 'gemini-1.5-flash-latest';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptText }] },
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 3200 }
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('Gemini API HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var cand = data && data.candidates && data.candidates[0];
      if (cand && cand.content && cand.content.parts && cand.content.parts[0]) {
        var reply = cand.content.parts[0].text || '';
        if (reply.trim()) return reply.trim();
      }
      throw new Error('Empty Gemini response');
    });
  }

  function callAI(userText, onDelta) {
    var pricingCtx = window.PRICING ? ('\n\nOfficial Pricing:\n' + JSON.stringify(window.PRICING)) : '';
    var isAr = lang() === 'ar';
    var systemPrompt = isAr
      ? 'Ø£Ù†Øª Ù…Ø³ØªØ´Ø§Ø± ØªÙ‚Ù†ÙŠ Ø£ÙˆÙ„ Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ Flutter Ø¹Ù„Ù‰ Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø¹Ø¨Ø¯ Ø§Ù„Ø±Ø­Ù…Ù† Ø¹Ø¨Ø¯ Ø§Ù„Ù„Ù‡. Ø§ÙƒØªØ¨ ÙƒÙ„ Ø´ÙŠØ¡ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„ÙØµØ­Ù‰ (Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙÙ‚Ø· Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©: FlutterØŒ FirebaseØŒ v0.1ØŒ Google Play). Ø§ÙƒØªØ¨ Ø¨Ø£Ø³Ù„ÙˆØ¨ Ù…Ù‚Ù†Ø¹ ÙˆØ§Ø­ØªØ±Ø§ÙÙŠ. Ù†Ø¸Ù… Ø§Ù„Ø®Ø·Ø© ÙÙŠ 5 Ø£Ù‚Ø³Ø§Ù… Ù…Ø±Ù‚Ù…Ø©:\n1) Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©\n2) Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ MVP\n3) Ù…Ø±Ø§Ø­Ù„ Ø§Ù„ØªÙ†ÙÙŠØ° (Ø£Ø³Ø¨ÙˆØ¹ 1: Ø¨Ø±ÙˆØªÙˆØªØ§ÙŠØ¨ FigmaØ› Ø£Ø³Ø¨ÙˆØ¹ 2: v0.1 Ø¹Ù„Ù‰ Ù‡Ø§ØªÙ Ø§Ù„Ø¹Ù…ÙŠÙ„Ø› Ø£Ø³Ø¨ÙˆØ¹ 3: v0.5Ø› Ø£Ø³Ø¨ÙˆØ¹ 4: Ù†Ø´Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù…ØªØ¬Ø±ÙŠÙ† + Ø³ÙˆØ±Ø³ ÙƒÙˆØ¯ + Ø¶Ù…Ø§Ù† 30 ÙŠÙˆÙ…)\n4) Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠØ© (Ø§Ù„Ø³Ø¹Ø± Ø¨Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©ØŒ Ø§Ø³Ù… Ø§Ù„Ø¨Ø§Ù‚Ø© Starter/Standard/ProØŒ Ø¯ÙØ¹ 3 Ø¯ÙØ¹Ø§Øª)\n5) ØªØ­Ø³ÙŠÙ†Ø§Øª Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠØ© Ù…Ù‚ØªØ±Ø­Ø© (3-4 Ø¥Ø¶Ø§ÙØ§Øª Ø°ÙƒÙŠØ©)' + pricingCtx
      : 'You are a Senior Flutter Project Consultant on the portfolio of Abdelrahman Abdullah. Write convincing, professional, client-converting plans in English. Organize into 5 numbered sections:\n1) Executive Blueprint & Value Proposition\n2) Core MVP Deliverables & Feature Scope\n3) Real Delivery Flow (Week 1: Figma prototype; Week 2: v0.1 build on device; Week 3: v0.5 staging; Week 4: Store release + source code + 30-day warranty)\n4) Investment & Budget (price in selected currency, recommend Starter/Standard/Pro, 3-milestone payments)\n5) Future Enhancements (3-4 high-ROI Phase 2 ideas)' + pricingCtx;

    var fullPrompt = userText;
    if (fullPrompt.indexOf('1)') === -1) fullPrompt += '\n\n' + PREFILL[lang()] + PREFILL_NOTE[lang()];

    if (!AI_ENDPOINT || AI_ENDPOINT.indexOf('YOUR-WORKER-NAME') !== -1) {
      return callGeminiDirect(fullPrompt, systemPrompt).then(function (txt) {
        if (onDelta) { try { onDelta(txt); } catch(e){} }
        return txt;
      });
    }

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, 8000) : null;
    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullPrompt, systemPrompt: systemPrompt, conversationHistory: [] }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('Worker HTTP ' + res.status);
      return res.json();
    }).then(function(j) {
      var msg = j && (j.message || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content));
      if (!msg) throw new Error('Empty Worker response');
      if (onDelta) { try { onDelta(msg); } catch(e){} }
      return msg;
    }).catch(function(err) {
      console.warn('[Worker error, fallback to Gemini]', err);
      return callGeminiDirect(fullPrompt, systemPrompt).then(function(txt) {
        if (onDelta) { try { onDelta(txt); } catch(e){} }
        return txt;
      });
    });
  }

  function parseSections(text) {
    var lines = text.split(/\r?\n/), secs = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^\s*(?:\*\*)?\s*(\d)\s*[).\-:]\s*\*?\*?\s*(\S.*)$/);
      if (m && +m[1] >= 1 && +m[1] <= 5) {
        if (cur) secs.push(cur);
        cur = { num: +m[1], title: m[2].replace(/\*+$/, '').trim(), body: [] };
      } else if (cur) { cur.body.push(lines[i]); }
    }
    if (cur) secs.push(cur);
    return secs;
  }

  function getEstimatedAmounts(currency) {
    var cur = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    var sym = cur.symbol;
    function fmt(v) { return v.toLocaleString() + ' ' + sym; }
    return {
      starter:  fmt(Math.round(150 * cur.rate)) + ' - ' + fmt(Math.round(350 * cur.rate)),
      standard: fmt(Math.round(450 * cur.rate)) + ' - ' + fmt(Math.round(950 * cur.rate)),
      pro:      fmt(Math.round(1100 * cur.rate)) + ' - ' + fmt(Math.round(2500 * cur.rate))
    };
  }

  function updateBudgetCardAmounts(activeCurr) {
    currentSelectedCurrency = activeCurr;
    if (currEl) currEl.value = activeCurr;
    // Sync form chips without triggering update loop
    currencyChips.forEach(function (chip) {
      var active = chip.getAttribute('data-curr') === activeCurr;
      chip.classList.toggle('on', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    var est = getEstimatedAmounts(activeCurr);
    var sEl = document.getElementById('price-tier-starter');
    var stdEl = document.getElementById('price-tier-standard');
    var pEl   = document.getElementById('price-tier-pro');
    if (sEl)   sEl.textContent   = est.starter;
    if (stdEl) stdEl.textContent = est.standard;
    if (pEl)   pEl.textContent   = est.pro;
    document.querySelectorAll('.curr-pill').forEach(function(pill) {
      pill.classList.toggle('active', pill.getAttribute('data-c') === activeCurr);
    });
    // Update selected tier price
    if (selectedBudgetTier.id === 'starter' && sEl)   selectedBudgetTier.price = est.starter;
    if (selectedBudgetTier.id === 'standard' && stdEl) selectedBudgetTier.price = est.standard;
    if (selectedBudgetTier.id === 'pro' && pEl)        selectedBudgetTier.price = est.pro;
  }

  function escapeHtml(str) {
    var d = document.createElement('div'); d.textContent = str; return d.innerHTML;
  }

  function renderPlan(text) {
    if (!bodyEl) return;
    lastGeneratedPlan = text;
    bodyEl.textContent = '';

    var secs = parseSections(text);
    var isAr = lang() === 'ar';
    var cur  = currentSelectedCurrency;
    var initialEst = getEstimatedAmounts(cur);

    var wrap = document.createElement('div');
    wrap.className = 'pr-cards-wrap';

    var icons  = { 1:'fa-bullseye', 2:'fa-layer-group', 3:'fa-stopwatch', 4:'fa-wallet', 5:'fa-rocket' };
    var badges = {
      1: isAr ? 'Ø§Ù„Ø±Ø¤ÙŠØ© ÙˆØ§Ù„Ù‡Ø¯Ù'            : 'Vision & Value',
      2: isAr ? 'Ù†Ø·Ø§Ù‚ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰'        : 'MVP Scope',
      3: isAr ? 'Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„ØªØ³Ù„ÙŠÙ…'     : 'Real Delivery Schedule',
      4: isAr ? 'Ø§Ù„ØªÙƒÙ„ÙØ© ÙˆØ§Ù„ØªØ³Ø¹ÙŠØ±'          : 'Investment & Pricing',
      5: isAr ? 'ØªØ­Ø³ÙŠÙ†Ø§Øª Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„'          : 'Future Add-ons'
    };

    var renderSecs = secs.length >= 3 ? secs : [];
    if (!renderSecs.length) {
      var fb = document.createElement('div'); fb.className = 'client-plan-card';
      var p  = document.createElement('div'); p.className = 'cpc-content'; p.setAttribute('dir','auto'); p.textContent = text.trim();
      fb.appendChild(p); wrap.appendChild(fb);
    } else {
      renderSecs.forEach(function(s) {
        var card = document.createElement('div');
        card.className = 'client-plan-card';
        var iconCls  = icons[s.num] || 'fa-check-circle';
        var badgeTxt = badges[s.num] || (isAr ? 'Ù‚Ø³Ù… ' + s.num : 'Section ' + s.num);
        var badgeCol = s.num === 3 ? 'badge-timeline' : (s.num === 4 ? 'badge-budget' : 'badge-highlight');

        var hdr = document.createElement('div'); hdr.className = 'cpc-header';
        hdr.innerHTML = '<div class="cpc-title"><i class="fas ' + iconCls + '"></i><span>' + escapeHtml(s.title) + '</span></div><span class="cpc-badge ' + badgeCol + '">' + badgeTxt + '</span>';
        card.appendChild(hdr);

        if (s.num === 3) {
          var tl = document.createElement('div'); tl.className = 'timeline-flow';
          tl.innerHTML = isAr ? [
            '<div class="timeline-step-box"><div class="tsb-week"><span>Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">Ø§Ù„ØªØµÙ…ÙŠÙ… ÙˆØ§Ù„Ø§ÙƒØªØ´Ø§Ù</div><div class="tsb-desc">Ø¨Ø±ÙˆØªÙˆØªØ§ÙŠØ¨ Figma ØªÙØ§Ø¹Ù„ÙŠ ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¨ÙŠØ²Ù†Ø³.</div><div class="tsb-handover"><i class="fas fa-check"></i> ÙŠØ³ØªÙ„Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø±Ø§Ø¨Ø· Ø§Ù„Ø¨Ø±ÙˆØªÙˆ</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">Ø¨Ù†Ø§Ø¡ Ø§Ù„Ù‡ÙŠÙƒÙ„ Ø¨Ù€ Flutter</div><div class="tsb-desc">ØªØ·ÙˆÙŠØ± Ø§Ù„Ø´Ø§Ø´Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø¹ Ù‡ÙŠÙƒÙ„ BLoC.</div><div class="tsb-handover"><i class="fas fa-mobile-alt"></i> Ù†Ø³Ø®Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ© v0.1 Ø¹Ù„Ù‰ Ù‡Ø§ØªÙÙ‡</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">Ø±Ø¨Ø· Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯</div><div class="tsb-desc">Ø±Ø¨Ø· Firebase ÙˆØ§Ù„Ù€ API ÙˆØ§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª.</div><div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> Ù†Ø³Ø®Ø© Ù…ÙƒØªÙ…Ù„Ø© v0.5</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">Ø§Ù„Ø¥Ø·Ù„Ø§Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ</div><div class="tsb-desc">Ù†Ø´Ø± Ø¹Ù„Ù‰ Google Play Ùˆ App Store ÙˆØ§Ø®ØªØ¨Ø§Ø± Ø´Ø§Ù…Ù„.</div><div class="tsb-handover"><i class="fas fa-award"></i> Ø³ÙˆØ±Ø³ ÙƒÙˆØ¯ ÙƒØ§Ù…Ù„ + Ø¶Ù…Ø§Ù† 30 ÙŠÙˆÙ…</div></div>'
          ].join('') : [
            '<div class="timeline-step-box"><div class="tsb-week"><span>Week 1</span> <i class="fas fa-pencil-ruler"></i></div><div class="tsb-title">Discovery & UI/UX</div><div class="tsb-desc">Interactive Figma prototype & business alignment.</div><div class="tsb-handover"><i class="fas fa-check"></i> Client receives prototype link</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Week 2</span> <i class="fas fa-code"></i></div><div class="tsb-title">Flutter Core Build</div><div class="tsb-desc">Core screens, BLoC architecture & navigation.</div><div class="tsb-handover"><i class="fas fa-mobile-alt"></i> Test build v0.1 on their device</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Week 3</span> <i class="fas fa-database"></i></div><div class="tsb-title">Backend Integration</div><div class="tsb-desc">Firebase / REST API, feature completion & QA.</div><div class="tsb-handover"><i class="fas fa-cloud-upload-alt"></i> Staging build v0.5</div></div>',
            '<div class="timeline-step-box"><div class="tsb-week"><span>Week 4</span> <i class="fas fa-rocket"></i></div><div class="tsb-title">Launch & Handover</div><div class="tsb-desc">Google Play & App Store submission, full QA.</div><div class="tsb-handover"><i class="fas fa-award"></i> Source code + 30-day warranty</div></div>'
          ].join('');
          card.appendChild(tl);
        }

        if (s.num === 4) {
          var cs = document.createElement('div'); cs.className = 'beh-curr-switcher';
          cs.innerHTML = '<span class="beh-curr-label">' + t('currSwitcherLabel') + '</span>' +
            '<button class="curr-pill' + (cur==='USD'?' active':'') + '" data-c="USD">USD</button>' +
            '<button class="curr-pill' + (cur==='EGP'?' active':'') + '" data-c="EGP">EGP</button>' +
            '<button class="curr-pill' + (cur==='SAR'?' active':'') + '" data-c="SAR">SAR</button>' +
            '<button class="curr-pill' + (cur==='AED'?' active':'') + '" data-c="AED">AED</button>';
          card.appendChild(cs);

          var hint = document.createElement('p'); hint.className = 'tier-select-hint';
          hint.textContent = t('tierSelectHint'); card.appendChild(hint);

          var bh = document.createElement('div'); bh.className = 'budget-estimate-highlight';
          bh.innerHTML = isAr ? [
            '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER"><div class="beh-tier-name">STARTER</div><div class="beh-price" id="price-tier-starter">' + initialEst.starter + '</div><div class="beh-desc">ØªØ·Ø¨ÙŠÙ‚Ø§Øª Ø®Ø¯Ù…ÙŠØ© Ø¨Ø³ÙŠØ·Ø©ØŒ Ø­ØªÙ‰ 5 Ø´Ø§Ø´Ø§Øª.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
            '<div class="beh-tier-card recommended selectable-tier" data-tier-id="standard" data-tier-name="STANDARD"><div class="beh-tier-name">â­ STANDARD (Ø§Ù„Ø£ÙƒØ«Ø± Ø·Ù„Ø¨Ø§)</div><div class="beh-price" id="price-tier-standard">' + initialEst.standard + '</div><div class="beh-desc">ØªØ·Ø¨ÙŠÙ‚Ø§Øª Ù…ØªÙƒØ§Ù…Ù„Ø©ØŒ Ø­ØªÙ‰ 12 Ø´Ø§Ø´Ø©.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
            '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO"><div class="beh-tier-name">PRO (Ø¥Ø·Ù„Ø§Ù‚ ÙƒØ§Ù…Ù„)</div><div class="beh-price" id="price-tier-pro">' + initialEst.pro + '</div><div class="beh-desc">ØªØ·Ø¨ÙŠÙ‚ Ø¥Ù†ØªØ§Ø¬ÙŠ ÙƒØ§Ù…Ù„ØŒ Ù†Ø´Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù…ØªØ¬Ø±ÙŠÙ†.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>'
          ].join('') : [
            '<div class="beh-tier-card selectable-tier" data-tier-id="starter" data-tier-name="STARTER"><div class="beh-tier-name">STARTER</div><div class="beh-price" id="price-tier-starter">' + initialEst.starter + '</div><div class="beh-desc">Lean utility apps, up to 5 screens.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
            '<div class="beh-tier-card recommended selectable-tier" data-tier-id="standard" data-tier-name="STANDARD"><div class="beh-tier-name">â­ STANDARD (Recommended)</div><div class="beh-price" id="price-tier-standard">' + initialEst.standard + '</div><div class="beh-desc">Complete e-commerce apps, up to 12 screens.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>',
            '<div class="beh-tier-card selectable-tier" data-tier-id="pro" data-tier-name="PRO"><div class="beh-tier-name">PRO (Full Launch)</div><div class="beh-price" id="price-tier-pro">' + initialEst.pro + '</div><div class="beh-desc">Full production app, unlimited screens, store deployment.</div><div class="beh-select-indicator"><i class="fas fa-check-circle"></i> ' + t('tierSelected') + '</div></div>'
          ].join('');
          card.appendChild(bh);

          selectedBudgetTier = { id: 'standard', name: 'STANDARD', price: initialEst.standard };
        }

        if (s.num === 5) {
          var eg = document.createElement('div'); eg.className = 'enhancements-grid';
          eg.innerHTML = isAr ? [
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>Ø¯Ù…Ø¬ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ</h5><p>Ù…Ø³Ø§Ø¹Ø¯ Ø°ÙƒÙŠ Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆÙ†Ø¸Ø§Ù… ØªÙˆØµÙŠØ§Øª Ù…Ø®ØµØµ.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>Ø­Ù…Ù„Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ©</h5><p>Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù…Ø¬Ø²Ø£Ø© Ù„Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ§Ø¹Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ØªÙ„Ù‚Ø§Ø¦ÙŠØ§.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>Ø¨ÙˆØ§Ø¨Ø§Øª Ø¯ÙØ¹ Ù…ØªØ¹Ø¯Ø¯Ø©</h5><p>Apple Pay ÙˆGoogle Pay ÙˆØ¨Ø·Ø§Ù‚Ø§Øª Ø¨Ù†ÙƒÙŠØ© Ù…Ø­Ù„ÙŠØ©.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>ØªØ­Ù„ÙŠÙ„Ø§Øª Ù‚Ù†ÙˆØ§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„</h5><p>Ø¨ÙŠØ§Ù†Ø§Øª ÙÙˆØ±ÙŠØ© Ø¹Ù† Ø³Ù„ÙˆÙƒ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙˆÙ…Ø¹Ø¯Ù„Ø§Øª Ø§Ù„Ø§Ø­ØªÙØ§Ø¸.</p></div></div>'
          ].join('') : [
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-brain"></i></div><div class="enhancement-text"><h5>AI Smart Assistant</h5><p>In-app generative chatbot & personalized recommendations.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-bell"></i></div><div class="enhancement-text"><h5>Automated Push Campaigns</h5><p>Segmented push notifications for user re-engagement.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-credit-card"></i></div><div class="enhancement-text"><h5>Multi-Currency Gateways</h5><p>Apple Pay, Google Pay, Stripe & local card processors.</p></div></div>',
            '<div class="enhancement-item"><div class="enhancement-icon"><i class="fas fa-chart-line"></i></div><div class="enhancement-text"><h5>Conversion Analytics</h5><p>Real-time telemetry & user retention behavioral metrics.</p></div></div>'
          ].join('');
          card.appendChild(eg);
        }

        var ct = document.createElement('div'); ct.className = 'cpc-content'; ct.setAttribute('dir','auto');
        ct.textContent = s.body.join('\n').trim(); card.appendChild(ct);
        wrap.appendChild(card);
      });
    }

    bodyEl.appendChild(wrap);

    // Wire plan-level currency pills
    bodyEl.querySelectorAll('.curr-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        var c = pill.getAttribute('data-c');
        if (c) updateBudgetCardAmounts(c);
      });
    });

    // Wire selectable tier cards
    bodyEl.querySelectorAll('.selectable-tier').forEach(function(tierCard) {
      tierCard.addEventListener('click', function() {
        bodyEl.querySelectorAll('.selectable-tier').forEach(function(tc) { tc.classList.remove('tier-selected'); });
        tierCard.classList.add('tier-selected');
        var priceEl = tierCard.querySelector('.beh-price');
        selectedBudgetTier = {
          id:    tierCard.getAttribute('data-tier-id'),
          name:  tierCard.getAttribute('data-tier-name'),
          price: priceEl ? priceEl.textContent : ''
        };
      });
      if (tierCard.getAttribute('data-tier-id') === 'standard') tierCard.classList.add('tier-selected');
    });

    // Action Box
    var abox = document.createElement('div'); abox.className = 'pr-review-box';
    abox.innerHTML = [
      '<div class="pr-contact-fields">',
      '  <div class="pr-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">',
      '    <input type="text" id="pr-client-name" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('namePh') + '">',
      '    <input type="text" id="pr-client-contact" class="pf-input" style="padding:12px 16px;font-size:14px;" placeholder="' + t('contactPh') + '">',
      '  </div>',
      '</div>',
      '<div class="pr-action-buttons">',
      '  <button type="button" id="pr-approve-btn"><i class="fab fa-whatsapp" style="font-size:18px;"></i> ' + t('approveBtn') + '</button>',
      '  <button type="button" id="pr-ask-btn"><i class="fas fa-question-circle"></i> ' + t('askBtn') + '</button>',
      '  <button type="button" id="pr-regen-btn"><i class="fas fa-sync-alt"></i> ' + t('regenBtn') + '</button>',
      '</div>',
      '<div id="pr-ask-panel" style="display:none;margin-top:18px;"><div style="display:flex;gap:10px;"><input type="text" id="pr-ask-input" class="pf-input" placeholder="' + t('askPh') + '" style="flex:1;"><button type="button" id="pr-ask-submit-btn" class="btn-primary" style="white-space:nowrap;padding:12px 20px;">' + t('sendQuestion') + '</button></div></div>',
      '<div id="pr-qa-stream" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;"></div>',
      '<div id="pr-status-msg" style="display:none;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;"></div>'
    ].join('\n');
    bodyEl.appendChild(abox);

    var approveBtn   = document.getElementById('pr-approve-btn');
    var askBtn2      = document.getElementById('pr-ask-btn');
    var regenBtn     = document.getElementById('pr-regen-btn');
    var askPanel     = document.getElementById('pr-ask-panel');
    var askInput     = document.getElementById('pr-ask-input');
    var askSubmitBtn = document.getElementById('pr-ask-submit-btn');
    var qaStream     = document.getElementById('pr-qa-stream');
    var statusMsg    = document.getElementById('pr-status-msg');

    if (regenBtn) regenBtn.addEventListener('click', function() {
      showState('empty');
      if (form && form.scrollIntoView) form.scrollIntoView({ behavior:'smooth' });
    });

    if (askBtn2 && askPanel) askBtn2.addEventListener('click', function() {
      var hidden = askPanel.style.display === 'none';
      askPanel.style.display = hidden ? 'block' : 'none';
      if (hidden && askInput) askInput.focus();
    });

    if (askSubmitBtn && askInput) {
      askSubmitBtn.addEventListener('click', function() {
        var qText = askInput.value.trim();
        if (!qText) return;
        askSubmitBtn.disabled = true;
        askSubmitBtn.textContent = t('asking');
        var qItem = document.createElement('div');
        qItem.style.cssText = 'background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:12px 16px;';
        qItem.innerHTML = '<div style="font-weight:700;color:var(--neon);margin-bottom:4px;">Q: ' + escapeHtml(qText) + '</div><div class="pr-qa-ans" style="color:var(--text);font-size:13px;line-height:1.6;"><i class="fas fa-spinner fa-spin"></i> ' + t('asking') + '</div>';
        qaStream.appendChild(qItem);
        askInput.value = '';
        var askPrompt = isAr
          ? 'Ø£Ø¬Ø¨ Ø¹Ù„Ù‰ Ø³Ø¤Ø§Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø«Ù‚Ø© ÙƒÙ…Ø³ØªØ´Ø§Ø± ØªÙ‚Ù†ÙŠ:\n\n[Ø§Ù„Ø®Ø·Ø©]:\n' + text + '\n\n[Ø§Ù„Ø³Ø¤Ø§Ù„]: ' + qText
          : 'Answer the client clearly as a senior Flutter architect:\n\n[Plan]:\n' + text + '\n\n[Question]: ' + qText;
        callAI(askPrompt, null).then(function(ans) {
          var ae = qItem.querySelector('.pr-qa-ans'); if (ae) ae.textContent = ans;
        }).catch(function() {
          var ae = qItem.querySelector('.pr-qa-ans');
          if (ae) ae.textContent = isAr ? 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ù…Ø¤Ù‚Øª. Ø±Ø§Ø³Ù„Ù†ÙŠ Ø¹Ù„Ù‰ ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø©.' : 'Unable to answer. Please message Abdelrahman directly on WhatsApp.';
        }).finally(function() {
          askSubmitBtn.disabled = false;
          askSubmitBtn.textContent = t('sendQuestion');
        });
      });
    }

    if (approveBtn) {
      approveBtn.addEventListener('click', function() {
        var clientName    = (document.getElementById('pr-client-name') && document.getElementById('pr-client-name').value.trim()) || (isAr ? 'Ø¹Ù…ÙŠÙ„ Ù…Ù‡ØªÙ…' : 'Interested Client');
        var clientContact = (document.getElementById('pr-client-contact') && document.getElementById('pr-client-contact').value.trim()) || '';
        var userIdea      = (ideaEl && ideaEl.value.trim()) || '';
        var curCode       = currentSelectedCurrency || 'USD';
        var curSym        = (CURRENCY_RATES[curCode] || CURRENCY_RATES.USD).symbol;
        var tierName      = selectedBudgetTier.name;
        var tierPrice     = selectedBudgetTier.price;
        var plat          = platforms();
        var deadline      = deadlineEl ? deadlineEl.options[deadlineEl.selectedIndex].text : '';
        var sep = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';

        var waMsg = isAr ? [
          '\u2705 Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø®Ø·Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹', sep,
          '\uD83D\uDC64 Ø§Ù„Ø§Ø³Ù…: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
          '\uD83D\uDCA1 ÙÙƒØ±Ø© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚: ' + userIdea,
          '\uD83D\uDCF1 Ø§Ù„Ù…Ù†ØµØ©: ' + plat,
          '\uD83D\uDCE6 Ø§Ù„Ø¨Ø§Ù‚Ø© Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©: ' + tierName + (tierPrice ? ' â€” ' + tierPrice : ''),
          '\uD83E\uDE99 Ø§Ù„Ø¹Ù…Ù„Ø©: ' + curCode + ' (' + curSym + ')',
          '\u23F1\uFE0F Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠ: ' + deadline, sep,
          '\uD83D\uDCCC Ù…Ø±Ø§Ø­Ù„ Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø§Ù„Ù…ØªÙÙ‚ Ø¹Ù„ÙŠÙ‡Ø§:',
          '  Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 1: Ø¨Ø±ÙˆØªÙˆØªØ§ÙŠØ¨ Figma ØªÙØ§Ø¹Ù„ÙŠ',
          '  Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 2: Ù†Ø³Ø®Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ© v0.1 Ø¹Ù„Ù‰ Ù‡Ø§ØªÙÙŠ',
          '  Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 3: Ù†Ø³Ø®Ø© Ù…ÙƒØªÙ…Ù„Ø© v0.5',
          '  Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ 4: Ù†Ø´Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù…ØªØ¬Ø±ÙŠÙ† + Ø³ÙˆØ±Ø³ ÙƒÙˆØ¯ + Ø¶Ù…Ø§Ù† 30 ÙŠÙˆÙ…', sep,
          'Ø£Ø±Ø¬Ùˆ Ø¬Ø¯ÙˆÙ„Ø© Ø§Ø³ØªØ´Ø§Ø±Ø© Ù…Ø¬Ø§Ù†ÙŠØ© (15 Ø¯Ù‚ÙŠÙ‚Ø©) Ù„ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ© ÙˆØ§Ù„Ø¨Ø¯Ø¡! \uD83D\uDE80'
        ].join('\n') : [
          '\u2705 Project Plan Approval', sep,
          '\uD83D\uDC64 Client: ' + clientName + (clientContact ? ' | ' + clientContact : ''),
          '\uD83D\uDCA1 App Concept: ' + userIdea,
          '\uD83D\uDCF1 Platform: ' + plat,
          '\uD83D\uDCE6 Selected Package: ' + tierName + (tierPrice ? ' \u2014 ' + tierPrice : ''),
          '\uD83E\uDE99 Currency: ' + curCode + ' (' + curSym + ')',
          '\u23F1\uFE0F Timeline: ' + deadline, sep,
          '\uD83D\uDCCC Agreed Delivery Flow:',
          '  Week 1: Interactive Figma prototype',
          '  Week 2: Test build v0.1 on my device',
          '  Week 3: Staging build v0.5',
          '  Week 4: Store release + source code + 30-day warranty', sep,
          'Please schedule our free 15-min alignment call to lock in the final quote! \uD83D\uDE80'
        ].join('\n');

        window.open('https://wa.me/201123031944?text=' + encodeURIComponent(waMsg), '_blank', 'noopener');

        var web3Key = window.PORTFOLIO_WEB3FORMS_KEY;
        if (web3Key && web3Key !== 'ACCESS_KEY_HERE') {
          fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_key: web3Key,
              subject: 'Plan Approved by ' + clientName + ' â€” ' + tierName,
              name: clientName,
              contact: clientContact,
              message: waMsg + '\n\n--- Plan Snippet ---\n' + text.slice(0, 2000)
            })
          }).catch(function(e) { console.warn('[Web3Forms Error]', e); });
        }

        if (statusMsg) {
          statusMsg.style.cssText = 'display:block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:#34d399;margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center;';
          statusMsg.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('successMsg');
        }
      });
    }

    showState('body');
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (btn && btn.disabled) return;
    var idea = ideaEl ? ideaEl.value.trim() : '';
    if (!idea) { showError(t('errIdea')); if (ideaEl) ideaEl.focus(); return; }
    if (idea.length > MAX_IDEA) idea = idea.slice(0, MAX_IDEA);
    if (errorEl) errorEl.hidden = true;
    showState('loading');
    setBusy(true);
    callAI(buildUserMessage(), function(partial) {
      if (previewEl && partial) { previewEl.textContent = partial; showState('preview'); }
    }).then(function(reply) {
      renderPlan(reply);
    }).catch(function(err) {
      console.error('[AI Planner Error]', err);
      showError(t('errGeneric'));
    }).finally(function() {
      setBusy(false);
    });
  });

})();