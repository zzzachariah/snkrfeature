import { Locale } from "@/lib/i18n/types";

const dict = {
  en: {
    nav: {
      home: "Home",
      compare: "Compare",
      submit: "Submit",
      dashboard: "Dashboard",
      admin: "Admin",
      advancedSearch: "Advanced Search",
      toggleMobileMenu: "Toggle mobile menu",
      closeMobileNavigation: "Close mobile navigation",
      languageSwitch: "Switch language"
    },
    home: {
      heroKicker: "Integrated Basketball Sneaker Feature Platform",
      heroTitle: "Compare, discuss, and choose your ideal basketball sneaker on SNKRFEATURE",
      heroDesc: "If you want to contribute to our community, please submit corrections, upload a new shoe, and discuss!",
      submitNew: "Submit new shoe info",
      openCompare: "Open compare",
      shoesIndexed: "Shoes indexed",
      brandsRepresented: "Brands represented",
      pipeline: "Submission review pipeline"
    },
    table: {
      placeholder: "Search by name, player, tags, technologies...",
      clearSearch: "Clear search",
      allBrands: "All brands",
      search: "Search",
      compare: "Compare",
      name: "Name",
      brand: "Brand",
      release: "Release",
      noMatches: "No sneakers match this search.",
      clearFilters: "Clear filters",
      selectedForCompare: "shoes selected for compare",
      compareNow: "Compare now"
    },
    shoe: {
      tbd: "TBD",
      noPlaystyle: "No playstyle summary available yet.",
      addToCompare: "Add to compare",
      submitCorrection: "Submit correction",
      forefootTech: "Forefoot tech",
      heelTech: "Heel tech",
      outsoleTech: "Outsole tech",
      upperTech: "Upper tech",
      notYetAdded: "Not yet added",
      performanceProfile: "Performance profile",
      storyProvenance: "Story & provenance",
      noStoryContent: "No editorial story content yet.",
      noStory: "No editorial story yet.",
      sourceEvidence: "Source/evidence: Seed dataset + community validation pipeline. Admin review required before promotion to official records.",
      relatedShoes: "Related shoes",
      backToDatabase: "Back to database",
      cushioningFeel: "Cushioning Feel",
      courtFeel: "Court Feel",
      bounce: "Bounce",
      stability: "Stability",
      traction: "Traction",
      fit: "Fit"
    }
  },
  zh: {
    nav: {
      home: "首页",
      compare: "对比",
      submit: "提交",
      dashboard: "仪表盘",
      admin: "管理",
      advancedSearch: "高级搜索",
      toggleMobileMenu: "切换移动菜单",
      closeMobileNavigation: "关闭移动导航",
      languageSwitch: "切换语言"
    },
    home: {
      heroKicker: "一体化篮球鞋特征平台",
      heroTitle: "在 SNKRFEATURE 上对比、讨论并选择你的理想篮球鞋",
      heroDesc: "欢迎为社区贡献内容：提交更正、上传新鞋款并参与讨论。",
      submitNew: "提交新鞋信息",
      openCompare: "打开对比",
      shoesIndexed: "已收录鞋款",
      brandsRepresented: "覆盖品牌",
      pipeline: "投稿审核流程"
    },
    table: {
      placeholder: "按鞋名、球员、标签、科技搜索…",
      clearSearch: "清除搜索",
      allBrands: "全部品牌",
      search: "搜索",
      compare: "对比",
      name: "名称",
      brand: "品牌",
      release: "发售",
      noMatches: "没有匹配当前搜索的鞋款。",
      clearFilters: "清空筛选",
      selectedForCompare: "双鞋已加入对比",
      compareNow: "立即对比"
    },
    shoe: {
      tbd: "待定",
      noPlaystyle: "暂未提供实战风格总结。",
      addToCompare: "加入对比",
      submitCorrection: "提交更正",
      forefootTech: "前掌科技",
      heelTech: "后跟科技",
      outsoleTech: "外底科技",
      upperTech: "鞋面科技",
      notYetAdded: "暂未添加",
      performanceProfile: "性能画像",
      storyProvenance: "故事与来源",
      noStoryContent: "暂未提供编辑故事内容。",
      noStory: "暂未提供编辑故事。",
      sourceEvidence: "来源/证据：种子数据集 + 社区校验流程。正式收录前需管理员审核。",
      relatedShoes: "相关鞋款",
      backToDatabase: "返回数据库",
      cushioningFeel: "缓震脚感",
      courtFeel: "场地感",
      bounce: "回弹",
      stability: "稳定性",
      traction: "抓地力",
      fit: "包裹贴合"
    }
  }
} as const;

export function getDictionary(locale: Locale) {
  return dict[locale];
}
