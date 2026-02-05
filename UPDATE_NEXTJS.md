# 🔄 คำสั่งอัปเดต Next.js

## วิธีอัปเดต Next.js

### 1. อัปเดต Next.js และ React (แนะนำ)

```bash
# เข้าไปที่โฟลเดอร์ frontend
cd frontend

# อัปเดต Next.js และ React เป็นเวอร์ชันล่าสุด
npm install next@latest react@latest react-dom@latest

# หรืออัปเดตเฉพาะ Next.js
npm install next@latest
```

### 2. อัปเดต dependencies ทั้งหมด

```bash
# ตรวจสอบ packages ที่ล้าสมัย
npm outdated

# อัปเดต packages ทั้งหมด (minor และ patch versions)
npm update

# อัปเดต packages ทั้งหมดรวม major versions (ระวัง!)
npx npm-check-updates -u
npm install
```

### 3. อัปเดต Next.js เป็นเวอร์ชันเฉพาะ

```bash
# อัปเดตเป็น Next.js 15 (เวอร์ชันปัจจุบันของคุณคือ 15.5.4)
npm install next@15

# หรืออัปเดตเป็น Next.js 14
npm install next@14
```

### 4. อัปเดต eslint-config-next ให้ตรงกับ Next.js

```bash
# อัปเดต eslint-config-next ให้ตรงกับ Next.js version
npm install eslint-config-next@latest
```

---

## ⚠️ สิ่งที่ต้องระวัง

### ก่อนอัปเดต
1. **Backup โค้ด** - commit หรือ backup ก่อน
2. **อ่าน Changelog** - ดู breaking changes
3. **ทดสอบ local** - รัน `npm run build` และ `npm run dev`

### หลังอัปเดต
1. **ทดสอบ build**: `npm run build`
2. **ทดสอบ dev server**: `npm run dev`
3. **ตรวจสอบ errors** ใน console

---

## 📋 คำสั่งแบบ Step-by-Step

```bash
# 1. เข้าไปที่โฟลเดอร์ frontend
cd D:\booking\frontend

# 2. ตรวจสอบเวอร์ชันปัจจุบัน
npm list next

# 3. อัปเดต Next.js
npm install next@latest

# 4. อัปเดต React และ React DOM (ถ้าจำเป็น)
npm install react@latest react-dom@latest

# 5. อัปเดต eslint-config-next
npm install eslint-config-next@latest

# 6. ทดสอบ build
npm run build

# 7. ทดสอบ dev server
npm run dev
```

---

## 🔍 ตรวจสอบเวอร์ชัน

```bash
# ดูเวอร์ชัน Next.js ปัจจุบัน
npm list next

# ดูเวอร์ชัน React
npm list react react-dom

# ดูเวอร์ชันทั้งหมด
npm list --depth=0
```

---

## 📚 เอกสารเพิ่มเติม

- [Next.js Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React Upgrade Guide](https://react.dev/blog/2023/03/16/introducing-react-dev)

---

## 💡 Tips

- **อัปเดตทีละน้อย**: อัปเดต Next.js ก่อน แล้วค่อยอัปเดต dependencies อื่นๆ
- **ใช้ npm-check-updates**: สำหรับดู packages ที่ต้องอัปเดต
- **อ่าน Migration Guide**: ถ้าอัปเดตจาก major version (เช่น 14 → 15)

