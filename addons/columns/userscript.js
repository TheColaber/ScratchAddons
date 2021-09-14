export default async function ({ addon, msg, global, console }) {
  const Blockly = await addon.tab.traps.getBlockly();
  const workspace = Blockly.getMainWorkspace();
  const toolbox = workspace.getToolbox();
  toolbox.dispose();
  toolbox.workspace_ = workspace;

  // https://github.com/LLK/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/toolbox.js#L235
  const _ToolboxPosition = Blockly.Toolbox.prototype.position;
  Blockly.Toolbox.prototype.position = function () {
    _ToolboxPosition.call(this);

    var treeDiv = this.HtmlDiv;
    if (!treeDiv) {
      // Not initialized yet.
      return;
    }
    // var svg = this.workspace_.getParentSvg();
    // var svgSize = Blockly.svgSize(svg);

    if (this.toolboxPosition == Blockly.TOOLBOX_AT_RIGHT) {
      // Right
      treeDiv.style.right = "0";
    } else {
      // Left
      treeDiv.style.left = "0";
    }
    treeDiv.style.setProperty("width", Blockly.VerticalFlyout.prototype.DEFAULT_WIDTH + 60 + "px");
  };

  // https://github.com/LLK/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/flyout_vertical.js#L314
  const _VerticalFlyoutPosition = Blockly.VerticalFlyout.prototype.position;
  Blockly.VerticalFlyout.prototype.position = function () {
    _VerticalFlyoutPosition.call(this);
    if (!this.isVisible()) {
      return;
    }
    var targetWorkspaceMetrics = this.targetWorkspace_.getMetrics();
    if (!targetWorkspaceMetrics) {
      // Hidden components will return null.
      return;
    }

    // This version of the flyout does not change width to fit its contents.
    // Instead it matches the width of its parent or uses a default value.
    this.width_ = this.getWidth();

    var toolboxWidth = this.parentToolbox_.getWidth();
    var categoryWidth = toolboxWidth - this.width_;
    var width = this.toolboxPosition_ == Blockly.TOOLBOX_AT_RIGHT ? targetWorkspaceMetrics.viewWidth : categoryWidth;

    this.width_ += width;

    var x = 0;
    var y = this.parentToolbox_.HtmlDiv.offsetHeight;

    // Record the height for Blockly.Flyout.getMetrics_
    this.height_ = Math.max(0, targetWorkspaceMetrics.viewHeight - y);

    this.setBackgroundPath_(this.width_, this.height_);

    this.svgGroup_.setAttribute("width", this.width_);
    this.svgGroup_.setAttribute("height", this.height_);
    var transform = "translate(" + x + "px," + y + "px)";
    Blockly.utils.setCssTransform(this.svgGroup_, transform);

    // Update the scrollbar (if one exists).
    if (this.scrollbar_) {
      // Set the scrollbars origin to be the top left of the flyout.
      this.scrollbar_.setOrigin(x + width, y);
      this.scrollbar_.resize();
    }
  };

  // https://github.com/LLK/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/toolbox.js#L710
  const _CategoryCreateDom = Blockly.Toolbox.Category.prototype.createDom;
  Blockly.Toolbox.Category.prototype.createDom = function () {
    _CategoryCreateDom.call(this);
    this.parent_.parent_.flyout_.position();
  };

  toolbox.init();
}