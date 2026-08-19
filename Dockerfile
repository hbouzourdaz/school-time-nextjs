# ==========================================
# Stage 1: Build latest FET from source
# ==========================================
FROM debian:bookworm-slim AS builder

# تثبيت أدوات البناء الأساسية و Qt5 ودعم xz
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    xz-utils \
    tar \
    g++ \
    make \
    qtbase5-dev \
    qt5-qmake \
    qtbase5-dev-tools

WORKDIR /build

# جلب أحدث ملف .tar.xz تلقائياً من الموقع، تحميله، وفك ضغطه
RUN LATEST_FILE=$(curl -s https://lalescu.ro/liviu/fet/download/ | grep -o 'fet-[0-9.]*\.tar\.xz' | head -n 1) \
    && echo "Downloading latest FET file: $LATEST_FILE" \
    && wget "https://lalescu.ro/liviu/fet/download/$LATEST_FILE" \
    && tar -xf "$LATEST_FILE" \
    && DIR_NAME=$(echo "$LATEST_FILE" | sed 's/\.tar\.xz//') \
    && mv "$DIR_NAME" fet-latest

WORKDIR /build/fet-latest

# بناء نسخة سطر الأوامر فقط (fet-cl) لتسريع وتوفير الموارد
RUN qmake src/src-cl.pro \
    && make -j$(nproc)


# ==========================================
# Stage 2: Production Environment
# ==========================================
FROM node:22-bookworm-slim

WORKDIR /app

# تثبيت المكتبات الأساسية التي يحتاجها محرك FET للعمل
RUN apt-get update && apt-get install -y \
    libqt5core5a \
    libqt5xml5 \
    libqt5network5 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# نسخ المحرك المبني من المرحلة الأولى (أحدث إصدار دائماً)
COPY --from=builder /build/fet-latest/fet-cl /usr/bin/fet-cl

# إعطاء صلاحية التنفيذ للمحرك
RUN chmod +x /usr/bin/fet-cl

# نسخ وبناء مشروع Next.js
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
