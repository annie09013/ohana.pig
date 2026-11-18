/* ===== 設定檔：所有網址、照片路徑都在這裡改 ===== */
const SITE_CONFIG = {
  INSTAGRAM_URL: "https://www.instagram.com/ohana.pig/",
  FACEBOOK_URL: "https://www.facebook.com/ohana.pigg/",
  LINE_ID: "@160ujzhn",
  LINE_URL: "https://line.me/R/ti/p/%40160ujzhn",
  COMMUNICATION_BOOKING_URL: "https://www.hello-ohanapig.com/booking/",

  // 動物溝通課程：介紹頁與報名頁
  COURSE_PAGE_URL: "/course/",
  COURSE_BOOKING_URL: "/course-booking/",
  ONE_DAY_COURSE_URL: "/course-booking/?course=ONE_DAY",
  TWO_DAY_COURSE_URL: "/course-booking/?course=TWO_DAY",

  // 照片路徑：放進 images/ 資料夾後，填入檔名即可。留空 "" 會顯示柔和佔位圖
  PHOTOS: {
    tata: "images/tata.jpg?v=2",
    qiaohu: "images/qiaohu.jpg?v=2",
    mimi: "images/mimi.jpg?v=2",
    general: "",   // 一般溝通插畫，例："images/general.jpg"（留空＝使用內建線稿）
    memorial: "",  // 離世溝通插畫，例："images/memorial.jpg"
    teacher: "",   // 【待補】課程頁「嗨，我是小豬」的講師照片，例："/images/teacher.jpg"（請以 / 開頭）
    story: ""      // 【待補】課程頁小豬故事旁的小照片或插畫，例："/images/course-story.jpg"
  },

  /* ===== 課程報名設定（報名頁 /course-booking/ 使用）=====
     · 開課日期、地點、名額、價格 → 請到 Google 試算表修改（Courses、Sessions 工作表）
     · Google 試算表 ID → 寫在 Apps Script 程式裡的 CONFIG.SPREADSHEET_ID（不放在網站上，比較安全）
  */
  COURSE_BOOKING: {
    // 【待補】Apps Script 部署後拿到的「網頁應用程式網址」（結尾是 /exec）
    API_URL: "https://script.google.com/macros/s/AKfycbwiPxQ5ed0NjK3_7zVdcIL4vqWOvdAhxrsweCu6fPUAUU3oJqv2Cxy2umWSPs64XtQ/exec",
    // 送出後要前往的 LINE 官方帳號（預設沿用上面的 LINE 設定）
    LINE_URL: "https://line.me/R/ti/p/%40160ujzhn",
    LINE_ID: "@160ujzhn",   // 有填 Basic ID，手機上就能自動帶入報名資訊
    // 試算表的 price 欄位空白時，顯示這段文字
    PRICE_FALLBACK: "依當期開課資訊公告",
    // 課程基本資訊（試算表 Courses 若有填 course_name / price，會以試算表為主）
    COURSES: {
      ONE_DAY: {
        label: "一日課程",
        title: "與自己的毛孩建立連結",
        en: "ONE-DAY CONNECTION COURSE",
        duration: "1 天"
      },
      TWO_DAY: {
        label: "兩日課程",
        title: "動物溝通基礎班",
        en: "TWO-DAY ANIMAL COMMUNICATION TRAINING",
        duration: "2 天，每天 10:00–17:00",
        classNote: "小班教學｜每梯次最多 4 位，滿 2 位即開課"
      }
    }
  }
};
