import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import type FormulaPilotPlugin from "./main";

export class FormulaPilotSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly formulaPilot: FormulaPilotPlugin) {
    super(app, formulaPilot);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const preferences = this.formulaPilot.getPreferences();

    new Setting(containerEl)
      .setName("启用数字快捷选择")
      .setDesc("候选框打开时使用主键盘或数字小键盘 1–7 选择当前页候选。")
      .addToggle((toggle) =>
        toggle.setValue(preferences.enableNumberShortcuts).onChange((value) => {
          this.formulaPilot.updatePreferences({ enableNumberShortcuts: value });
        }),
      );

    new Setting(containerEl)
      .setName("显示公式预览")
      .setDesc("在候选列表旁显示实际公式、完整 LaTeX 和参数顺序。")
      .addToggle((toggle) =>
        toggle.setValue(preferences.showPreview).onChange((value) => {
          this.formulaPilot.updatePreferences({ showPreview: value });
        }),
      );

    new Setting(containerEl)
      .setName("记录本地使用频率")
      .setDesc("只在相似度完全相同时调整候选顺序；数据不会离开本机。")
      .addToggle((toggle) =>
        toggle.setValue(preferences.trackUsage).onChange((value) => {
          this.formulaPilot.updatePreferences({ trackUsage: value });
        }),
      );

    new Setting(containerEl)
      .setName("候选框字号")
      .setDesc("选择候选菜单的界面字号。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("small", "小")
          .addOption("default", "跟随 Obsidian")
          .addOption("large", "大")
          .setValue(preferences.candidateFontSize)
          .onChange((value) => {
            const candidateFontSize = value === "small" || value === "large" ? value : "default";
            this.formulaPilot.updatePreferences({ candidateFontSize });
          }),
      );

    new Setting(containerEl)
      .setName("模式默认高亮")
      .setDesc("只改变结构化模板模式菜单的初始高亮，不跳过菜单。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("guided", "自动填充")
          .addOption("direct", "直接插入")
          .setValue(preferences.defaultMode)
          .onChange((value) => {
            this.formulaPilot.updatePreferences({
              defaultMode: value === "direct" ? "direct" : "guided",
            });
          }),
      );

    new Setting(containerEl)
      .setName("清除使用历史")
      .setDesc("删除使用次数、最近使用时间和模板上次模式，恢复内置稳定排序。")
      .addButton((button) =>
        button.setButtonText("清除").onClick(async () => {
          await this.formulaPilot.clearUsageHistory();
          button.setButtonText("已清除");
        }),
      );

    new Setting(containerEl)
      .setName("调试日志")
      .setDesc("仅在开发测试库排查语法树和会话问题时启用。")
      .addToggle((toggle) =>
        toggle.setValue(preferences.debug).onChange((value) => {
          this.formulaPilot.updatePreferences({ debug: value });
        }),
      );
  }
}
