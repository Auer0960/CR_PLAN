/**
 * 從世界觀設定批量匯入名詞到 Supabase app_data.glossaryTerms
 * 執行：node scripts/import_glossary.mjs
 */

const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';
const NOW = Date.now();

const uuid = () => crypto.randomUUID();

// ─── 名詞資料 ───────────────────────────────────────────────────────────────

const GLOSSARY_TERMS = [

  // ══════════════════════════════════════════════
  // 專業名詞
  // ══════════════════════════════════════════════
  {
    id: uuid(), name: 'Y病毒', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '性質', value: '類似流感的變異性病毒，類病原體' },
      { label: '來源', value: '從「亞當計畫」衍生的副產品，從路西恩身上提煉而來' },
      { label: '致命性', value: '造成大量死亡與社會混亂；感染症狀包含流感症狀、罕見喪屍化、暴走攻擊行為、嗜血食人' },
      { label: '長期後遺症', value: '極少部分人出現外貌變化' },
      { label: '真實目的', value: '芙瑞妲製造世人覺醒的契機；讓人注意到托比亞總統不老不死的特徵' },
      { label: '機密等級', value: '公開（民間流傳）' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: 'Y病毒疫苗', category: '專業名詞',
    aliases: ['催化劑'],
    fields: [
      { label: '雙重命名', value: 'GeneX實驗室內部稱「催化劑」；官方大眾認知為「Y病毒疫苗」' },
      { label: '治療作用', value: '能使Y病毒休眠' },
      { label: '特殊效果', value: '誘發受感染者的超能力（覺醒）' },
      { label: '輕微副作用', value: '極少部分人因後遺症出現外貌變化' },
      { label: '嚴重副作用', value: '可能誘發覺醒者現象' },
      { label: '機密等級', value: '半機密（催化劑為實驗室內部術語）' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '覺醒者', category: '專業名詞',
    aliases: ['超能力者'],
    fields: [
      { label: '覺醒條件', value: '體內具備Y病毒，並施打催化劑/Y病毒疫苗作為佐劑' },
      { label: '政府立場', value: '政府仍否認、不承認覺醒者的存在' },
      { label: '民間認知', value: '廣為流傳，並為覺醒者界定能力編號' },
      { label: 'S級', value: '最強覺醒者，能量總數最大，可視為人型戰車' },
      { label: 'A級', value: '超強覺醒者，並擁有特殊專長' },
      { label: 'B級', value: '稀有覺醒者，能力勝過大多數人' },
      { label: 'C級', value: '優秀覺醒者，一對一下未受訓普通人無法戰勝' },
      { label: 'D級', value: '一般覺醒者，主要能力體現在身體以外的地方' },
      { label: '晉級方式', value: '使用「覺醒劑」可再次晉級，風險高達90%喪命' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '潛在覺醒者', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '定義', value: '感染Y病毒後自行痊癒、或施打疫苗後具備覺醒能力卻仍未覺醒之人' },
      { label: '覺醒方式', value: '重複施打催化劑/Y病毒疫苗，或在特定刺激下覺醒' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '殺戮模式', category: '專業名詞',
    aliases: ['狂戰士模式'],
    fields: [
      { label: '狀態描述', value: '失去自我意識，全身細胞湧出力量，進入純粹戰鬥狀態，無痛覺' },
      { label: '外觀特徵', value: '瞳孔發紅光' },
      { label: '能力增幅', value: '超增幅力量與速度' },
      { label: '觸發條件（一般）', value: 'S級以上覺醒者可透過催化劑觸發' },
      { label: '觸發條件（特殊）', value: '西奧多與路西恩無需催化劑，在生命受威脅時可進入' },
      { label: '使用代價', value: '結束後強烈虛弱，恢復需1天以上；西奧多幾乎無副作用但短期情感鈍感' },
      { label: '起源', value: 'Y病毒感染後激發的本能反應' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '催情劑「夢幻」', category: '專業名詞',
    aliases: ['夢幻', '作夢'],
    fields: [
      { label: '目標群體', value: '感染過Y病毒的人' },
      { label: '效果', value: '產生強烈性慾與快感，放大感官' },
      { label: '成癮性', value: '含有高度成癮性與身體副作用' },
      { label: '俚語', value: '吸食夢幻的過程稱為「作夢」' },
      { label: '副作用', value: '每人症狀不同，通常迫使使用者再度吸食' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '覺醒劑', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '作用', value: '使覺醒者或潛在覺醒者有機會再次晉級階段等級' },
      { label: '使用限制', value: '若未感染Y病毒及注射疫苗，則無效果' },
      { label: '風險', value: '承受極大身體痛苦；覺醒失敗者器官在短時間內衰竭而亡（失敗率約90%）' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '強化劑', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '使用對象', value: '任何人都能使用' },
      { label: '效果', value: '短時間內發揮身體兩倍以上力量' },
      { label: '短期副作用', value: '時間結束後因透支處於虛弱狀態' },
      { label: '過量風險', value: '一次過量使用，有大機率使身體細胞過度激活導致暴斃' },
      { label: '長期風險', value: '長期使用可能導致身體失去控制力而崩潰' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '完美人類', category: '專業名詞',
    aliases: ['南極發現的女性眼球'],
    fields: [
      { label: '提出者', value: 'GeneX實驗室' },
      { label: '目標', value: '創造出可以免於生老病死的完美人類' },
      { label: '成功案例', value: '僅有芙瑞妲、西奧多母子' },
      { label: '特徵', value: '不老不死；擁有超能力；免疫並吸收Y病毒相關產物' },
      { label: '機密等級', value: '最高機密' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '原初基因', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '現存位置', value: '僅存在西奧多、芙瑞妲，以及南極發現的眼球上；路西恩身上有殘缺不完整的基因載體' },
      { label: '成熟後特徵', value: '成為成熟體後才完整，擁有不老不死；有超能力；免疫Y病毒' },
      { label: '芙瑞妲狀態', value: '能力完全顯現' },
      { label: '西奧多狀態', value: '初期未顯現（僅傷口恢復較快）；血月之夜成為確認的關鍵證據' },
      { label: '機密等級', value: '最高機密' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '寡頭', category: '專業名詞',
    aliases: ['七大寡頭家族'],
    fields: [
      { label: '定義', value: '托比亞共和國背後真正掌握權力的七個財閥家族' },
      { label: '七大家族', value: '米契爾斯、休斯、理查德、拉薩德、班德勒、巴隆、加爾加' },
      { label: '當前最強勢', value: '米契爾斯家族——因大瘟疫取得疫苗分配權；GeneX實驗室創立者' },
      { label: '控制範圍', value: '政策走向、軍警調動、財政預算、媒體輿論、高科技產業、武裝力量' },
      { label: '表面統治者', value: '傀儡政府（芙瑞妲總統）由寡頭推出' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '超國界的革命運動', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '基本主張', value: '不以特定國家利益為依歸，主張跨越疆界、對抗全球極權與壓迫體制' },
      { label: '代表組織', value: '地獄光明革新派視自身為此運動的一環' },
      { label: '核心理念', value: '「革命不應受限於國土、族群與政治範疇」；「無國界的人道正義」' },
      { label: '社會評價', value: '部分人視為人道正義；部分人視為激進甚至危險' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '漂流者', category: '專業名詞',
    aliases: [],
    fields: [
      { label: '定義', value: '月華組用語，指稱無依無靠的流浪之人（多為外來移民）' },
      { label: '保護關係', value: '月華組內部提供保護，被保護者以回報作為交換' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },

  // ══════════════════════════════════════════════
  // 勢力組織
  // ══════════════════════════════════════════════
  {
    id: uuid(), name: '月華組', category: '勢力組織',
    aliases: [],
    fields: [
      { label: '核心理念', value: '援助、地區保護、庇護弱者、俠義精神' },
      { label: '領導者', value: '甚月 平八（稱呼：組長）' },
      { label: '勢力範圍', value: '紅燈區、高級夜總會、俱樂部、一般商店街、舊城區' },
      { label: '道德底線', value: '禁絕毒品、欺壓與賭博在地盤上出現' },
      { label: '刺青風格', value: '日式和雕刺青，浮士繪類型' },
      { label: '敵對勢力', value: '青龍幫' },
      { label: '社會評價', value: '地區凝聚力極高；一定程度承接聖紫羅蘭之家的工作' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '卡迪久家族', category: '勢力組織',
    aliases: [],
    fields: [
      { label: '核心理念', value: '守護、黑白通吃、家族榮譽、低調穩健' },
      { label: '領導者', value: '西蒙・卡迪久（稱呼：家主）' },
      { label: '勢力範圍', value: '夜店、酒吧、房地產、礦業進出口、地下金融與黑市' },
      { label: '行事風格', value: '低調且注重格調；成員少有刺青，主要身著西裝' },
      { label: '家主動向', value: '正考慮金盆洗手' },
      { label: '敵對勢力', value: '羅士昂兄弟會' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '青龍幫', category: '勢力組織',
    aliases: [],
    fields: [
      { label: '核心理念', value: '瓦解、對症下藥，講究流勢' },
      { label: '領導者', value: '龍應天（稱呼：老爺）' },
      { label: '勢力範圍', value: '連鎖商鋪、高級商店街、毒藥品、賭場、人口販售、洗錢' },
      { label: '主要業務', value: '人口販賣、地下賭場、地下賽事、低端偽製藥毒品' },
      { label: '聯盟關係', value: '與羅士昂兄弟會為同盟；與純淨源醫院有關連' },
      { label: '擴張目標', value: '想併吞月華組與卡迪久家族' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '羅士昂兄弟會', category: '勢力組織',
    aliases: ['RoseArm'],
    fields: [
      { label: '核心理念', value: '侵略、鐵血紀律，力量至上，復仇必行，同生共死' },
      { label: '領導者', value: '尼古拉（稱呼：老大）' },
      { label: '勢力範圍', value: '地下走私、軍火組裝製作、傭兵、黑市' },
      { label: '核心目標', value: '成為最強最大的組織' },
      { label: '軍火來源', value: '與拉薩德家族聯繫，使用走私路線與洩漏設計圖' },
      { label: '國際業務', value: '走私軍火到國外，是加姆解放組織的武裝來源' },
      { label: '聯盟關係', value: '與青龍幫為同盟（隨時可能背叛）' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: 'GeneX實驗室', category: '勢力組織',
    aliases: [],
    fields: [
      { label: '核心理念', value: '貪婪' },
      { label: '領導者', value: '芙瑞妲' },
      { label: '創立者', value: '米契爾斯家族' },
      { label: '首席研究官', value: '久世 紗羅（Sara）' },
      { label: '研究範圍', value: '複製人、基因改造、人體實驗；不老不死研究；洗腦使人服從' },
      { label: '主要項目', value: '亞當計畫' },
      { label: '資金困境', value: '米契爾斯家族式微後仰賴其他寡頭家族' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '純淨源醫藥集團', category: '勢力組織',
    aliases: ['純淨源醫院'],
    fields: [
      { label: '核心理念', value: '欺騙' },
      { label: '公開形象', value: '知名新興生物科技與醫藥企業；推動人類健康與疾病防控' },
      { label: '隱藏聯繫', value: '與青龍幫有關連' },
      { label: '負責人', value: '原為芙瑞妲，後轉移至藤井 美優（196年）' },
      { label: '附屬機構', value: '純淨源醫院：提供高品質醫療服務與低廉收費' },
      { label: '關聯事件', value: '大瘟疫' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: 'HL娛樂經紀公司', category: '勢力組織',
    aliases: ['地獄光明', 'HL', '地獄光明HL'],
    fields: [
      { label: '核心理念', value: '偽裝' },
      { label: '表面業務', value: '托比亞國內頂級娛樂公司；偶像培訓、娛樂經紀' },
      { label: '真實目的', value: '地獄光明HL組織滲透托比亞的合法掩護；情報蒐集、人員與資金流動' },
      { label: '領導者', value: '安東（稱呼：老闆、安東先生）' },
      { label: '背後勢力', value: '地獄光明HL組織' },
      { label: '成立時間', value: '197年，三年內成頂級娛樂公司' },
      { label: '秘密設施', value: '情報中心、訓練設施、武器庫存、安全屋' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '聖紫羅蘭之家', category: '勢力組織',
    aliases: ['聖紫羅蘭'],
    fields: [
      { label: '核心特色', value: '桃源' },
      { label: '主要業務', value: '收容孤兒的場所' },
      { label: '社會地位', value: '院長修女瑪蓮德高望重；具有獨立保護性' },
      { label: '開放政策', value: '認養需要考核；每年一次成年祭開放參觀' },
      { label: '現狀', value: '在血月之夜事件後毀滅；原址改建為「聖紫羅蘭紀念公園」' },
      { label: '影響', value: '許多相關人士追查血月之夜真相；大部分調查者被消失或噤聲' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },

  // ══════════════════════════════════════════════
  // 地區場所
  // ══════════════════════════════════════════════
  {
    id: uuid(), name: 'Vortex', category: '地區場所',
    aliases: ['Vortex夜店'],
    fields: [
      { label: '性質', value: '夜店' },
      { label: '隸屬', value: '卡迪久家族' },
      { label: '特色', value: '因卡迪久家族排斥毒品的經營風格，受年輕人信賴；暗中有毒品流傳' },
      { label: '登場章節', value: '第一章節' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '月詠館', category: '地區場所',
    aliases: ['月詠館女僕咖啡店'],
    fields: [
      { label: '性質', value: '風俗女僕咖啡店' },
      { label: '隸屬', value: '月華組' },
      { label: '服務', value: '咖啡、輕食、女僕陪伴及風俗相關服務' },
      { label: '功能', value: '月華組重要據點與合法資金來源' },
      { label: '登場章節', value: '第二章節' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '月見湯', category: '地區場所',
    aliases: ['超級錢湯'],
    fields: [
      { label: '性質', value: '浴場／情色按摩店' },
      { label: '隸屬', value: '月華組' },
      { label: '服務', value: '泡澡、吃飯、私人湯屋、按摩，亦提供情色按摩服務' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '聖紫羅蘭紀念公園', category: '地區場所',
    aliases: [],
    fields: [
      { label: '前身', value: '聖紫羅蘭之家' },
      { label: '轉變事件', value: '血月之夜事件後設立' },
      { label: '現狀', value: '國家級哀悼場所；教堂廢墟原封保存於園區一隅' },
      { label: '年度活動', value: '每年國殤之日，大量民眾前往獻花、點燭悼念' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '純淨源醫院', category: '地區場所',
    aliases: [],
    fields: [
      { label: '宗旨', value: '提供「真摯與恰到好處的溫暖服務」' },
      { label: '特色', value: '高品質醫療服務與低廉收費' },
      { label: '隸屬', value: '純淨源醫藥集團' },
      { label: '建設時間', value: '196年' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: 'HL娛樂經紀公司大樓', category: '地區場所',
    aliases: ['HL大樓'],
    fields: [
      { label: '定位', value: '藝術文化中心（表面）；地獄光明在托比亞的秘密基地（實際）' },
      { label: '公開功能', value: '娛樂經紀、藝人培訓；錄音室、練舞室' },
      { label: '秘密設施', value: '情報中心、訓練設施、武器庫存、安全屋' },
      { label: '建案', value: '卡迪久家族建築項目' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '黑市', category: '地區場所',
    aliases: [],
    fields: [
      { label: '控制勢力', value: '卡迪久家族把持' },
      { label: '交易項目', value: '違禁品交易、地下金融服務、走私、非法服務、非法強化藥物' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '地下擂台', category: '地區場所',
    aliases: [],
    fields: [
      { label: '性質', value: '非法格鬥競技場' },
      { label: '經營者', value: '卡迪久家族' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '地下賭場', category: '地區場所',
    aliases: [],
    fields: [
      { label: '經營者', value: '青龍幫' },
      { label: '服務項目', value: '賭博、賽事、高利貸、洗錢' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '地下實驗室', category: '地區場所',
    aliases: [],
    fields: [
      { label: '經營者', value: 'GeneX實驗室' },
      { label: '用途', value: '人體實驗、基因改造' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },

  // ══════════════════════════════════════════════
  // 活動事件
  // ══════════════════════════════════════════════
  {
    id: uuid(), name: '天堂之門', category: '活動事件',
    aliases: ['偶像選拔大賽'],
    fields: [
      { label: '性質', value: '由HL娛樂經紀公司舉辦的平民變偶像選拔大賽，一年一屆' },
      { label: '收視率', value: '極高，是托比亞共和國不會錯過的熱門節目' },
      { label: '第一屆', value: '昆妮奪冠，成為全民女神' },
      { label: '第二屆', value: '露比因年齡資料爭議，決賽敗給潔西卡；衍生網暴事件' },
      { label: '政治意義', value: '地獄光明（HL公司）的政治滲透工具' },
      { label: '登場章節', value: '第一章節' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '宵霞祭', category: '活動事件',
    aliases: ['商店街慶典'],
    fields: [
      { label: '舉辦方', value: '月華組' },
      { label: '舉辦地點', value: '月華組管轄商店街' },
      { label: '目的', value: '促進地區繁榮，增強社區凝聚力' },
      { label: '內容', value: '各式市集與展售會、各國特色料理、藝人表演、遊戲攤位；漂流者展示文化與藝術表演' },
      { label: '登場章節', value: '第二章節' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '成年祭', category: '活動事件',
    aliases: ['聖紫羅蘭之家傳統儀式'],
    fields: [
      { label: '性質', value: '聖紫羅蘭之家傳統宗教慈善儀式' },
      { label: '舉辦時間', value: '每年月亮最圓最明亮的夜晚' },
      { label: '對象', value: '年滿十八、由教會收容長大的少年少女' },
      { label: '意義', value: '象徵即將步入社會、獨立面對人生' },
      { label: '現狀', value: '血月之夜事件後終止；成為無數人心中的痛' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '國殤之日', category: '活動事件',
    aliases: ['血月之夜紀念日'],
    fields: [
      { label: '設立原因', value: '為紀念「血月之夜」慘案' },
      { label: '性質', value: '國定哀悼日' },
      { label: '官方活動', value: '全國降半旗、全民默哀、總統發表談話；在聖紫羅蘭紀念公園舉辦追悼儀式' },
      { label: '民間活動', value: '前往紀念公園憑弔、點蠟燭祈禱、獻花' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },

  // ══════════════════════════════════════════════
  // 重大事件
  // ══════════════════════════════════════════════
  {
    id: uuid(), name: '亞當計畫', category: '重大事件',
    aliases: [],
    fields: [
      { label: '時間', value: '152年至今' },
      { label: '地點', value: '托比亞 GeneX實驗室' },
      { label: '目的', value: '突破生命科學疆界；人類生存極限研究、細胞再生、抗衰老、神經強化、病毒免疫' },
      { label: '關鍵事件', value: '162年南極科研隊發現女性眼球（原初基因），計畫正式命名為亞當計畫' },
      { label: '主要成果', value: '芙瑞妲獲得不老不死（完美人類）；Y病毒誕生；大瘟疫' },
      { label: '機密等級', value: '最高機密' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '血月之夜', category: '重大事件',
    aliases: ['聖紫羅蘭慘案'],
    fields: [
      { label: '時間', value: '191年' },
      { label: '地點', value: '聖紫羅蘭之家（成年祭當晚）' },
      { label: '事件經過', value: '韓特與芙瑞妲為擄走西奧多策劃，韓特服用催化劑失控進入殺戮模式，屠殺逾百人；路西恩介入救走西奧多' },
      { label: '唯一生還者', value: '西奧多' },
      { label: '死亡者', value: '瑪蓮（院長修女，49歲）等逾百人' },
      { label: '官方定性', value: '無差別殺人案，至今未破懸案' },
      { label: '名稱由來', value: '血跡將圓月染紅' },
      { label: '後續影響', value: '聖紫羅蘭之家毀滅，改建為紀念公園；設立國殤之日；許多調查者被消失' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: uuid(), name: '大瘟疫', category: '重大事件',
    aliases: [],
    fields: [
      { label: '時間', value: '192年（193年疫苗研發成功）' },
      { label: '真相', value: '芙瑞妲（55歲）將自行栽培的Y病毒從GeneX實驗室刻意流出，引發全球大流行' },
      { label: '規模', value: '一年造成接近億人死亡；全球人口大量減少；社會秩序崩潰' },
      { label: '疫苗控制', value: '193年芙瑞妲研發疫苗；米契爾斯家族掌控分配權' },
      { label: '政治影響', value: '芙瑞妲當選總統，成為威望人物；部分感染者覺醒成為覺醒者' },
      { label: '機密等級', value: '真相為最高機密' },
    ],
    relatedCharacterIds: [], relatedEventIds: [],
    createdAt: NOW, updatedAt: NOW,
  },
];

// ─── 主流程 ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`準備匯入 ${GLOSSARY_TERMS.length} 筆名詞…`);

  // 1. 取得現有 app_data
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main&select=data`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  const rows = await getRes.json();
  if (!rows || rows.length === 0) {
    console.error('❌ 找不到 app_data，請確認 Supabase 已有資料');
    process.exit(1);
  }

  const currentData = rows[0].data;
  const existingTerms = currentData.glossaryTerms || [];
  const existingNames = new Set(existingTerms.map(t => t.name));

  // 2. 過濾掉已存在的（避免重複）
  const toAdd = GLOSSARY_TERMS.filter(t => !existingNames.has(t.name));
  if (toAdd.length === 0) {
    console.log('✅ 所有名詞已存在，無需新增');
    return;
  }

  console.log(`新增 ${toAdd.length} 筆（跳過 ${GLOSSARY_TERMS.length - toAdd.length} 筆已存在）`);

  // 3. 合併並存回
  const newData = {
    ...currentData,
    glossaryTerms: [...existingTerms, ...toAdd],
  };

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ data: newData, updated_at: new Date().toISOString() }),
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error(`❌ 寫入失敗 HTTP ${patchRes.status}:`, err);
    process.exit(1);
  }

  console.log(`✅ 成功寫入 ${toAdd.length} 筆名詞！`);
  toAdd.forEach(t => console.log(`  • [${t.category}] ${t.name}${t.aliases?.length ? ` (${t.aliases.join(', ')})` : ''}`));
}

main().catch(e => { console.error('❌ 例外:', e); process.exit(1); });
