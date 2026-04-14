import { defineI18nUI } from "fumadocs-ui/i18n";
import { i18n } from "@/lib/i18n";

export const i18nUI = defineI18nUI(i18n, {
	en: {
		displayName: "English",
	},
	"zh-CN": {
		displayName: "简体中文",
		search: "搜索文档",
		searchNoResult: "没有找到结果",
		toc: "目录",
		tocNoHeadings: "没有标题",
		lastUpdate: "最后更新",
		chooseLanguage: "选择语言",
		nextPage: "下一页",
		previousPage: "上一页",
		chooseTheme: "选择主题",
		editOnGithub: "在 GitHub 上编辑",
	},
	ja: {
		displayName: "日本語",
		search: "ドキュメントを検索",
		searchNoResult: "結果が見つかりませんでした",
		toc: "目次",
		tocNoHeadings: "見出しがありません",
		lastUpdate: "最終更新",
		chooseLanguage: "言語を選択",
		nextPage: "次のページ",
		previousPage: "前のページ",
		chooseTheme: "テーマを選択",
		editOnGithub: "GitHub で編集",
	},
});
