# سمارت كاش · Smart Cash — نظرة عامة على المشروع

منصة لإدارة الحسابات والعُهد والمصروفات والفواتير والاعتمادات، تجمع بساطة الدفتر اليومي مع حوكمة مالية للشركات.

**المرجع الوظيفي:** تطبيق Konnash (inyad) — إعادة تنفيذ مستقلة للوظائف العامة بأسلوب الغرفة النظيفة، بهوية وشيفرة خاصة بنا.

## الحالة: المرحلة 1 معتمدة · المرحلة 2 جارية · النموذج 0.6

| الوثيقة | المحتوى |
|---|---|
| [REVERSE_ENGINEERING_REPORT.md](REVERSE_ENGINEERING_REPORT.md) | تحليل التطبيق المرجعي + خريطة الوظائف + ما لم يمكن التحقق منه |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | نموذج البيانات + 56 اختبار سلامة ناجحاً |
| [SEGMENTS_AND_INTEGRATIONS.md](SEGMENTS_AND_INTEGRATIONS.md) | الأفراد والمؤسسات الصغيرة والشركات الكبرى، واتساب، أنظمة ERP، ما أُخذ من SiFi |
| [PAYMENTS_SAVINGS_SUPPORT.md](PAYMENTS_SAVINGS_SUPPORT.md) | روابط الدفع وواتساب، الحساب الذكي، الادخار، إعدادات كل منشأة، فحص النظام، الدعم الفني |
| [USER_ROLES_PERMISSIONS.md](USER_ROLES_PERMISSIONS.md) | مصفوفة الصلاحيات ونطاقات البيانات |
| [APPROVAL_WORKFLOW.md](APPROVAL_WORKFLOW.md) | مسارات الاعتماد، دورة حياة العهدة والحافظة |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | تقييم التقنيات والبنية ومحرك الفواتير والمزامنة |
| [SCREENS_DESIGN.md](SCREENS_DESIGN.md) | خريطة الشاشات والهياكل الأساسية |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | المراحل السبع، بوابات الاعتماد، القرارات |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | الألوان، الخطوط، اللغات الست، المكونات، الرسوم الخطية |

## هيكل المستودع

```
smart-cash/
├── docs/        الوثائق
├── db/
│   ├── schema.sql   نموذج PostgreSQL التنفيذي
│   └── tests.sql    اختبارات السلامة المالية
├── prototype/
│   ├── smart-cash.html  النموذج التفاعلي (الإصدار 0.3)
│   └── js/  geo.js · data.js · plans.js · core.js · views.js · views2.js · i18n/ (12 لغة)
├── backend/     (المرحلة 3) NestJS
└── app/         (المرحلة 3) Flutter
```

## الوثائق المتبقية حسب المرحلة

BUSINESS_REQUIREMENTS (2) · API_DOCUMENTATION، SECURITY_POLICY، AI_INVOICE_ENGINE، PETTY_CASH_MANAGEMENT، INVOICE_BATCHING_SYSTEM (3) · TESTING_REPORT (6) · DEPLOYMENT_GUIDE، USER_MANUAL_AR (7)

## ملاحظة عن بيئة العمل

بيئة العمل الحالية: Node.js 22، Python 3.13، PostgreSQL 16 (استُخدم لاختبار النموذج). Flutter وDocker غير متاحين فيها؛ سيلزم تثبيتهما أو العمل على جهازكم في المرحلة 3.
