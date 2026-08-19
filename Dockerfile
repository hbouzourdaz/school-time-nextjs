# استخدام صورة Node.js رسمية خفيفة مبنية على Debian
FROM node:22-bookworm-slim

# تعيين مجلد العمل
WORKDIR /app

# تحديث مدير الحزم وتثبيت محرك FET الأصلي لبيئة لينكس
RUN apt-get update && apt-get install -y fet \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# نسخ ملفات تعريف الحزم
COPY package.json package-lock.json* ./

# تثبيت الحزم (الاعتمادات)
RUN npm install

# نسخ كامل ملفات المشروع
COPY . .

# بناء مشروع Next.js
# في حال كنت تستخدم متغيرات بيئة (Environment Variables) معينة في البناء، يجب إضافتها هنا
RUN npm run build

# كشف المنفذ الخاص بـ Next.js
EXPOSE 3000

# تشغيل الخادم
CMD ["npm", "start"]
