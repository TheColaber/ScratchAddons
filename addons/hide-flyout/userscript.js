export default async function ({ addon, global, console }) {
  let toggleSetting = addon.settings.get("toggle");

  const ScratchBlocks = await addon.tab.traps.getBlockly();

  ScratchBlocks.Lock = function (workspace, horizontal, opt_class) {
    this.workspace_ = workspace;
    this.horizontal_ = horizontal;

    this.lock = false;

    this.createDom_(opt_class);

    this.onMouseDownHandleWrapper_ = ScratchBlocks.bindEventWithChecks_(
      this.outerSvg_,
      "mousedown",
      this,
      this.onMouseDownHandle_
    );
  };
  ScratchBlocks.Lock.LOCK_SVG =
    "M12 13a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1zm5-4V7A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zM9 7a3 3 0 0 1 6 0v2H9zm9 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z";
  ScratchBlocks.Lock.UNLOCK_SVG =
    "M12 13a1.49 1.49 0 0 0-1 2.61V17a1 1 0 0 0 2 0v-1.39A1.49 1.49 0 0 0 12 13zm5-4H9V7a3 3 0 0 1 5.12-2.13 3.08 3.08 0 0 1 .78 1.38 1 1 0 1 0 1.94-.5 5.09 5.09 0 0 0-1.31-2.29A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zm1 10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z";

  ScratchBlocks.Lock.prototype.createDom_ = function (opt_class) {
    var className = "blocklyLock" + (this.horizontal_ ? "Horizontal" : "Vertical");
    if (opt_class) {
      className += " " + opt_class;
    }
    this.outerSvg_ = ScratchBlocks.utils.createSvgElement(
      "svg",
      { class: className, height: "24px", width: "24px" },
      null
    );
    this.svgPath_ = ScratchBlocks.utils.createSvgElement(
      "path",
      {
        d: ScratchBlocks.Lock.UNLOCK_SVG,
      },
      this.outerSvg_
    );
    ScratchBlocks.utils.insertAfter(this.outerSvg_, this.workspace_.getParentSvg());
  };

  ScratchBlocks.Lock.prototype.onMouseDownHandle_ = function (e) {
    this.workspace_.markFocused();
    ScratchBlocks.hideChaff(true);
    ScratchBlocks.DropDownDiv.hideWithoutAnimation();

    if (ScratchBlocks.utils.isRightButton(e)) {
      // Right-click.
      e.stopPropagation();
      return;
    }

    this.lock = !this.lock;
    this.svgPath_.setAttribute("d", this.lock ? ScratchBlocks.Lock.LOCK_SVG : ScratchBlocks.Lock.UNLOCK_SVG);

    e.stopPropagation();
    e.preventDefault();
  };

  ScratchBlocks.Lock.prototype.position = function (x, y) {
    this.hideTranslate = { x, y };
    ScratchBlocks.utils.setCssTransform(this.outerSvg_, "translate(" + x + "px," + y + "px)");
  };

  ScratchBlocks.Lock.prototype.dispose = function () {
    ScratchBlocks.unbindEvent_(this.onMouseDownHandleWrapper_);
    this.outerSvg_.remove();
    this.onMouseDownHandleWrapper_ = null;
    this.workspace_ = null;
    this.outerSvg_ = null;
    this.svgPath_ = null;
  };

  // https://github.com/LLK/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/flyout_base.js#L307
  const _init = ScratchBlocks.Flyout.prototype.init;
  ScratchBlocks.Flyout.prototype.init = function (targetWorkspace) {
    // Only create a lock if the setting is set to a hover setting.
    if (toggleSetting === "hover" || toggleSetting === "cathover") {
      this.lock_ = new ScratchBlocks.Lock(this.workspace_, this.horizontalLayout_, "blocklyFlyoutLock");
    }

    this.hidden = false;

    _init.call(this, targetWorkspace);
  };

  // https://github.com/LLK/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/flyout_vertical.js#L314
  const _VerticalPosition = ScratchBlocks.VerticalFlyout.prototype.position;
  ScratchBlocks.VerticalFlyout.prototype.position = function () {
    _VerticalPosition.call(this);
    if (!this.isVisible()) {
      return;
    }
    var targetWorkspaceMetrics = this.targetWorkspace_.getMetrics();
    if (!targetWorkspaceMetrics) {
      // Hidden components will return null.
      return;
    }
    if (this.parentToolbox_) {
      var toolboxWidth = this.parentToolbox_.getWidth();
      var categoryWidth = toolboxWidth - this.width_;
      var x =
        this.toolboxPosition_ == ScratchBlocks.TOOLBOX_AT_RIGHT ? targetWorkspaceMetrics.viewWidth : categoryWidth;
    } else {
      var x =
        this.toolboxPosition_ == ScratchBlocks.TOOLBOX_AT_RIGHT ? targetWorkspaceMetrics.viewWidth - this.width_ : 0;
    }
    // variable "x" should be where the left side of the flyout is.
    // In LTR, that should just be the width of the categories.

    this.hidePosition = x;
    this.hideTranslate = x;

    let hostMetrics = this.workspace_.getMetrics();

    var y = hostMetrics.absoluteTop + 0.5;
    x += hostMetrics.absoluteLeft + 0.5;

    if (!this.workspace_.RTL) {
      x += hostMetrics.viewWidth - ScratchBlocks.Scrollbar.scrollbarThickness - 1;
      x -= 24;
    } else {
      x += 12;
    }

    // If lock was created, position it at the corner of the flyout.
    if (this.lock_) {
      this.lock_.position(x, y);
    }

    // Set a variable to the position of the flyout.
    this.placeholderPos = this.getClientRect();
    if (!this.documentMouseMoveWrapper_) {
      // When the user moves their mouse, check ifthey are
      // on the positon of the flyout.
      this.documentMouseMoveWrapper_ = ScratchBlocks.bindEvent_(document, "mousemove", this, function (e) {
        if (workspace.isFlyout) {
          return;
        }

        var { left, top, width, height } = this.placeholderPos;
        if (toggleSetting === "cathover") {
          var { left, top, width, height } = this.getCategoryPlaceHolderPos();
          console.log({ left, top, width, height });
        } else if (toggleSetting === "hover") {
          left -= this.hidePosition;
          width += this.hidePosition;
        } else {
          return;
        }
        const { pageX, pageY } = e;
        if (this.lock_.lock || (pageX > left && pageX < left + width && pageY > top && pageY < top + height)) {
          if (this.hidden) {
            this.showWithAnimation();
          }
        } else {
          if (!this.hidden) {
            this.hideWithAnimation();
          }
        }
      });
    }
  };

  ScratchBlocks.Flyout.prototype.getCategoryPlaceHolderPos = function () {
    let { left, top, width, height } = this.placeholderPos;
    var toolboxWidth = this.parentToolbox_.getWidth();
    var categoryWidth = toolboxWidth - this.width_;
    if (this.RTL) {
      left += this.hideTranslate - this.hidePosition;
      width += categoryWidth + this.hidePosition - this.hideTranslate;
    } else {
      left -= categoryWidth;
      width += this.hideTranslate;
    }
    return { left, top, width, height };
  };

  const _dispose = ScratchBlocks.Flyout.prototype.dispose;
  ScratchBlocks.Flyout.prototype.dispose = function () {
    if (this.lock_) {
      this.lock_.dispose();
    }
    if (this.documentMouseMoveWrapper_) {
      ScratchBlocks.unbindEvent_(this.documentMouseMoveWrapper_);
      this.documentMouseMoveWrapper_ = null;
    }
    _dispose.call(this);
  };

  const _setPosition_ = ScratchBlocks.Scrollbar.prototype.setPosition_;
  ScratchBlocks.Scrollbar.prototype.setPosition_ = function (posx, posy) {
    _setPosition_.call(this, posx, posy);
    var x = this.position_.x + this.origin_.x;
    var y = this.position_.y + this.origin_.y;
    this.hideTranslate = { x, y };
  };

  const _recordDeleteAreas_ = ScratchBlocks.WorkspaceSvg.prototype.recordDeleteAreas_;
  ScratchBlocks.WorkspaceSvg.prototype.recordDeleteAreas_ = function () {
    _recordDeleteAreas_.call(this);
    if (this.getFlyout()) {
      this.deleteAreaToolbox_ = this.getFlyout().placeholderPos;
    }
  };

  const _setSelectedItemFactory = ScratchBlocks.Toolbox.prototype.setSelectedItemFactory;
  ScratchBlocks.Toolbox.prototype.setSelectedItemFactory = function (item) {
    const _callback = _setSelectedItemFactory.call(this, item);
    return function () {
      if (toggleSetting === "category") {
        if (this.flyout_.hidden) {
          this.flyout_.showWithAnimation();
        } else {
          if (this.selectedItem_ === item) {
            this.flyout_.hideWithAnimation();
          }
        }
      }
      _callback.call(this);
    };
  };

  const _setBlocksAndShow = ScratchBlocks.BlockDragSurfaceSvg.prototype.setBlocksAndShow;
  ScratchBlocks.BlockDragSurfaceSvg.prototype.setBlocksAndShow = function (blocks) {
    _setBlocksAndShow.call(this, blocks);
    var injectionDiv = document.getElementsByClassName("injectionDiv")[0];
    injectionDiv.style.overflow = "hidden";
  };

  ScratchBlocks.Flyout.prototype.hideWithAnimation = function () {
    if (this.toolboxPosition_ == ScratchBlocks.TOOLBOX_AT_RIGHT) {
      this.hideTarget = this.hidePosition + this.getWidth();
    } else {
      this.hideTarget = this.hidePosition - this.getWidth();
    }
    this.hidden = true;
    this.stepHideAnimation();
  };

  ScratchBlocks.Flyout.prototype.showWithAnimation = function () {
    this.hideTarget = this.hidePosition;
    this.hidden = false;
    this.stepHideAnimation();
  };

  ScratchBlocks.Flyout.prototype.stepHideAnimation = function () {
    if (!this.svgGroup_ || this.hideTarget == null) {
      return;
    }

    var diff = this.hideTarget - this.hideTranslate;
    if (Math.abs(diff) < 1) {
      this.hideTranslate = this.hideTarget;
      ScratchBlocks.utils.setCssTransform(this.svgGroup_, "translateX(" + this.hideTranslate + "px)");
      this.hideTarget = null;
      return;
    }
    const speed = {
      none: 1,
      short: 0.4,
      default: 0.2,
      long: 0.1,
    }[addon.settings.get("speed")];

    diff *= speed;

    this.hideTranslate += diff;
    ScratchBlocks.utils.setCssTransform(this.svgGroup_, "translateX(" + this.hideTranslate + "px)");
    if (this.lock_) {
      this.lock_.hideTranslate.x += diff;
      ScratchBlocks.utils.setCssTransform(
        this.lock_.outerSvg_,
        "translate(" + this.lock_.hideTranslate.x + "px, " + this.lock_.hideTranslate.y + "px)"
      );
    }
    this.scrollbar_.hideTranslate.x += diff;
    ScratchBlocks.utils.setCssTransform(
      this.scrollbar_.outerSvg_,
      "translate(" + this.scrollbar_.hideTranslate.x + "px, " + this.scrollbar_.hideTranslate.y + "px)"
    );

    requestAnimationFrame(this.stepHideAnimation.bind(this));
  };

  // Get the current workspace's toolbox, dispose it,
  // and create a new one, to allow our polluted scripts to run.
  const workspace = ScratchBlocks.getMainWorkspace();
  const toolbox = workspace.getToolbox();
  toolbox.flyout_.dispose();
  toolbox.categoryMenu_.dispose();
  toolbox.categoryMenu_ = null;
  toolbox.HtmlDiv.remove();
  toolbox.lastCategory_ = null;
  toolbox.init();
}
