export default async function ({ addon, msg, console }) {
  const Blockly = await addon.tab.traps.getBlockly();

  class MiddleClickPopup {
    constructor(workspace) {
      this.containerVisible_ = true;
      this.isVisible_ = false;
      this.DEFAULT_WIDTH = 200;
      this.CORNER_RADIUS = 0;
      this.SCROLLBAR_PADDING = 2;
      this.MARGIN = 12;
      this.GAP_X = Blockly.Flyout.prototype.MARGIN * 3;
      this.GAP_Y = Blockly.Flyout.prototype.MARGIN;
      this.TOP_MARGIN = 30;
      const workspaceOptions = {
        disabledPatternId: workspace.options.disabledPatternId,
        parentWorkspace: workspace,
        RTL: workspace.RTL,
        oneBasedIndex: workspace.options.oneBasedIndex,
        horizontalLayout: workspace.horizontalLayout,
        toolboxPosition: workspace.options.toolboxPosition,
        stackGlowFilterId: workspace.options.stackGlowFilterId,
        getMetrics: this.getMetrics_.bind(this),
        setMetrics: this.setMetrics_.bind(this),
      };
      this.workspace_ = new Blockly.WorkspaceSvg(workspaceOptions);
      this.workspace_.isMiddleClickPopup = true;

      this.RTL = !!workspaceOptions.RTL;
      this.horizontalLayout_ = workspaceOptions.horizontalLayout;
      this.eventWrappers_ = [];
      this.recycleBlocks_ = [];
      this.permanentlyDisabled_ = [];
      this.backgroundButtons_ = [];
      this.listeners_ = [];
      this.buttons_ = [];
      this.autoClose = true;

      this.positionXY = { x: 0, y: 0 };

      this.createDom();
      this.init(workspace);
    }

    init(targetWorkspace) {
      this.targetWorkspace_ = targetWorkspace;
      this.workspace_.targetWorkspace = targetWorkspace;

      this.scrollbar_ = new Blockly.Scrollbar(
        this.workspace_,
        false,
        false,
        "blocklyFlyoutScrollbar middle-click-scrollbar"
      );

      this.position();

      Array.prototype.push.apply(
        this.eventWrappers_,
        Blockly.bindEventWithChecks_(this.svgGroup_, "wheel", this, this.wheel_)
      );
      // Dragging the flyout up and down (or left and right).
      Array.prototype.push.apply(
        this.eventWrappers_,
        Blockly.bindEventWithChecks_(this.svgGroup_, "mousedown", this, this.onMouseDown_)
      );

      this.workspace_.getGesture = this.targetWorkspace_.getGesture.bind(this.targetWorkspace_);

      // Get variables from the main workspace rather than the target workspace.
      this.workspace_.variableMap_ = this.targetWorkspace_.getVariableMap();

      this.workspace_.createPotentialVariableMap();

      this.workspace_.scale = targetWorkspace.scale;
    }

    createDom() {
      this.svgGroup_ = Blockly.utils.createSvgElement(
        "svg",
        { class: "middle-click-dropdown", style: "display: none;" },
        document.querySelector(".injectionDiv")
      );
      this.svgBackground_ = Blockly.utils.createSvgElement(
        "path",
        { class: "blocklyFlyoutBackground" },
        this.svgGroup_
      );
      this.svgGroup_.appendChild(this.workspace_.createDom());

      this.defs_ = Blockly.utils.createSvgElement("defs", {}, this.svgGroup_);
      var clipPath = Blockly.utils.createSvgElement("clipPath", { id: "blocklyBlockMenuClipPath" }, this.defs_);
      this.clipRect_ = Blockly.utils.createSvgElement(
        "rect",
        {
          id: "blocklyBlockMenuClipRect",
          height: "0",
          width: "0",
          y: "0",
          x: "0",
        },
        clipPath
      );
      this.workspace_.svgGroup_.setAttribute("clip-path", "url(#blocklyBlockMenuClipPath)");

      this.input_ = document.createElement("input");
      this.input_.className = "middle-click-input";
      this.input_.style.display = "none";
      document.body.append(this.input_);
    }

    position() {
      if (!this.isVisible()) {
        return;
      }

      this.width_ = this.getWidth();
      this.height_ = this.getHeight();

      this.setBackgroundPath_(this.width_, this.height_);

      this.svgGroup_.style.left = this.positionXY.x + "px";
      this.svgGroup_.style.top = this.positionXY.y + "px";
      this.svgGroup_.setAttribute("width", this.width_);
      this.svgGroup_.setAttribute("height", this.height_);

      this.input_.style.left = this.positionXY.x + this.MARGIN / 2 + "px";
      this.input_.style.top = this.positionXY.y + this.MARGIN / 2 + "px";
      this.input_.style.width = this.width_ - this.MARGIN * 2 + "px";
      this.input_.focus();

      if (this.scrollbar_) {
        // Set the scrollbars origin to be the top left of the popup.
        this.scrollbar_.setOrigin(this.positionXY.x, this.positionXY.y);
        this.scrollbar_.resize();
      }
      this.svgGroup_.style.opacity = 1;
    }

    setBackgroundPath_(width, height) {
      var path = ["M " + 0 + "," + 0];
      // Top.
      path.push("h", width);
      // Rounded corner.
      path.push("a", this.CORNER_RADIUS, this.CORNER_RADIUS, 0, 0, 1, this.CORNER_RADIUS, this.CORNER_RADIUS);
      // Side closest to workspace.
      path.push("v", Math.max(0, height + this.TOP_MARGIN - this.CORNER_RADIUS * 2) - this.TOP_MARGIN);
      // Rounded corner.
      path.push("a", this.CORNER_RADIUS, this.CORNER_RADIUS, 0, 0, 1, -this.CORNER_RADIUS, this.CORNER_RADIUS);
      // Bottom.
      path.push("h", -width);
      path.push("z");
      this.svgBackground_.setAttribute("d", path.join(" "));
    }

    isDragTowardWorkspace(currentDragDeltaXY) {
      return true;
    }

    isVisible() {
      return this.isVisible_;
    }

    setVisible(visible) {
      var visibilityChanged = visible != this.isVisible();

      this.isVisible_ = visible;
      if (visibilityChanged) {
        this.updateDisplay_();
      }
    }

    updateDisplay_() {
      var show = true;
      if (!this.containerVisible_) {
        show = false;
      } else {
        show = this.isVisible();
      }
      this.svgGroup_.style.display = show ? "block" : "none";
      this.input_.style.display = show ? "block" : "none";
      // Update the scrollbar's visiblity too since it should mimic the
      // flyout's visibility.
      this.scrollbar_.setContainerVisible(show);
    }

    setContainerVisible(visible) {
      var visibilityChanged = visible != this.containerVisible_;
      this.containerVisible_ = visible;
      if (visibilityChanged) {
        this.updateDisplay_();
      }
    }

    setScrollPos(pos) {
      this.scrollbar_.set(pos * this.workspace_.scale);
    }

    setRecyclingEnabled(recycle) {
      this.recyclingEnabled_ = recycle;
    }

    isScrollable() {
      return this.scrollbar_ ? this.scrollbar_.isVisible() : false;
    }

    getWidth() {
      return this.DEFAULT_WIDTH;
    }

    getHeight() {
      return this.DEFAULT_WIDTH;
    }

    getMetrics_() {
      if (!this.isVisible()) {
        // Flyout is hidden.
        return null;
      }
      var optionBox = this.getContentBoundingBox_();
      var absoluteTop = this.SCROLLBAR_PADDING;
      var absoluteLeft = 0;
      var viewHeight = this.height_ - 2 * this.SCROLLBAR_PADDING - this.TOP_MARGIN;
      var viewWidth = this.getWidth() - this.SCROLLBAR_PADDING;
      var contentHeight = optionBox.height * this.workspace_.scale;
      this.recordCategoryScrollPositions_();
      var bottomPadding = this.MARGIN;
      // if (this.categoryScrollPositions.length > 0) {
      //   var lastLabel = this.categoryScrollPositions[
      //       this.categoryScrollPositions.length - 1];
      //   var lastPos = lastLabel.position * this.workspace_.scale;
      //   var lastCategoryHeight = contentHeight - lastPos;
      //   if (lastCategoryHeight < viewHeight) {
      //     bottomPadding = viewHeight - lastCategoryHeight;
      //   }
      // }

      var metrics = {
        viewHeight: viewHeight,
        viewWidth: viewWidth,
        contentHeight: contentHeight + bottomPadding,
        contentWidth: optionBox.width * this.workspace_.scale + 2 * this.MARGIN,
        viewTop: -this.workspace_.scrollY + optionBox.y + this.TOP_MARGIN,
        viewLeft: -this.workspace_.scrollX,
        contentTop: optionBox.y + this.TOP_MARGIN,
        contentLeft: optionBox.x,
        absoluteTop: absoluteTop + this.TOP_MARGIN,
        absoluteLeft: absoluteLeft,
      };
      return metrics;
    }

    setMetrics_(xyRatio) {
      var metrics = this.getMetrics_();
      // This is a fix to an apparent race condition.
      if (!metrics) {
        return;
      }
      if (!Number.isNaN(xyRatio.y)) {
        this.workspace_.scrollY = -metrics.contentHeight * xyRatio.y;
      }
      this.workspace_.translate(
        this.workspace_.scrollX + metrics.absoluteLeft,
        this.workspace_.scrollY + metrics.absoluteTop
      );

      this.clipRect_.setAttribute("x", 0);
      this.clipRect_.setAttribute("y", this.TOP_MARGIN);
      this.clipRect_.setAttribute("height", Math.max(0, metrics.viewHeight) + "px");
      this.clipRect_.setAttribute("width", metrics.viewWidth + "px");

      // if (this.categoryScrollPositions) {
      //   this.selectCategoryByScrollPosition(-this.workspace_.scrollY);
      // }
    }

    getContentBoundingBox_() {
      var contentBounds = this.workspace_.getBlocksBoundingBox();
      var bounds = {
        xMin: contentBounds.x,
        yMin: contentBounds.y,
        xMax: contentBounds.x + contentBounds.width,
        yMax: contentBounds.y + contentBounds.height,
      };

      // Check if any of the buttons/labels are outside the blocks bounding box.
      for (var i = 0; i < this.buttons_.length; i++) {
        var button = this.buttons_[i];
        var buttonPosition = button.getPosition();
        if (buttonPosition.x < bounds.xMin) {
          bounds.xMin = buttonPosition.x;
        }
        if (buttonPosition.y < bounds.yMin) {
          bounds.yMin = buttonPosition.y;
        }
        // Button extends past the bounding box to the right.
        if (buttonPosition.x + button.width > bounds.xMax) {
          bounds.xMax = buttonPosition.x + button.width;
        }

        // Button extends past the bounding box on the bottom
        if (buttonPosition.y + button.height > bounds.yMax) {
          bounds.yMax = buttonPosition.y + button.height;
        }
      }

      return {
        x: bounds.xMin,
        y: bounds.yMin,
        width: bounds.xMax - bounds.xMin,
        height: bounds.yMax - bounds.yMin,
      };
    }

    recordCategoryScrollPositions_() {}

    scrollToStart() {
      this.scrollbar_.set(0);
    }

    hide() {
      if (!this.isVisible()) {
        return;
      }
      this.setVisible(false);
      // Delete all the event listeners.
      for (var x = 0, listen; (listen = this.listeners_[x]); x++) {
        Blockly.unbindEvent_(listen);
      }
      this.listeners_.length = 0;
      if (this.reflowWrapper_) {
        this.workspace_.removeChangeListener(this.reflowWrapper_);
        this.reflowWrapper_ = null;
      }
    }

    setXMLList() {
      const targetFlyout = this.targetWorkspace_.getFlyout();
      if (!targetFlyout) return;
      const flyoutWorkspace = targetFlyout.getWorkspace();
      if (!flyoutWorkspace) return;
      const flyoutDom = Blockly.Xml.workspaceToDom(flyoutWorkspace);
      this.xmlList = [...Blockly.Options.parseToolboxTree(flyoutDom).children];
    }

    show(x, y) {
      this.positionXY = { x, y };
      this.input_.value = "";

      this.workspace_.setResizesEnabled(false);
      this.hide();

      this.setVisible(true);

      this.clearOldBlocks_();

      this.setXMLList();

      // Create the blocks to be shown in this flyout.
      this.contents = [];
      this.gaps = [];
      this.additionalBlocks = [];
      this.permanentlyDisabled_.length = 0;
      for (var i = 0, xml; (xml = this.xmlList[i]); i++) {
        // Handle dynamic categories, represented by a name instead of a list of XML.
        // Look up the correct category generation function and call that to get a
        // valid XML list.
        // if (typeof xml === "string") {
        //   var fnToApply = this.workspace_.targetWorkspace.getToolboxCategoryCallback(xmlList[i]);
        //   var newList = fnToApply(this.workspace_.targetWorkspace);
        //   // Insert the new list of blocks in the middle of the list.
        //   // We use splice to insert at index i, and remove a single element
        //   // (the placeholder string). Because the spread operator (...) is not
        //   // available, use apply and concat the array.
        //   xmlList.splice.apply(xmlList, [i, 1].concat(newList));
        //   xml = xmlList[i];
        // }
        if (xml.tagName) {
          var tagName = xml.tagName.toUpperCase();
          var default_gap = this.horizontalLayout_ ? this.GAP_X : this.GAP_Y;
          if (tagName == "BLOCK") {
            // We assume that in a flyout, the same block id (or type if missing id) means
            // the same output BlockSVG.

            // Look for a block that matches the id or type, our createBlock will assign
            // id = type if none existed.
            var id = xml.getAttribute("id") || xml.getAttribute("type");
            var recycled = this.recycleBlocks_.findIndex(function (block) {
              return block.id === id;
            });

            // If we found a recycled item, reuse the BlockSVG from last time.
            // Otherwise, convert the XML block to a BlockSVG.
            var curBlock;
            if (recycled > -1) {
              curBlock = this.recycleBlocks_.splice(recycled, 1)[0];
            } else {
              curBlock = Blockly.Xml.domToBlock(xml, this.workspace_);
            }

            if (curBlock.disabled) {
              // Record blocks that were initially disabled.
              // Do not enable these blocks as a result of capacity filtering.
              this.permanentlyDisabled_.push(curBlock);
            }
            this.contents.push({ type: "block", block: curBlock });
            var gap = parseInt(xml.getAttribute("gap"), 10);
            this.gaps.push(isNaN(gap) ? default_gap : gap);
          } else if (xml.tagName.toUpperCase() == "SEP") {
            // Change the gap between two blocks.
            // <sep gap="36"></sep>
            // The default gap is 24, can be set larger or smaller.
            // This overwrites the gap attribute on the previous block.
            // Note that a deprecated method is to add a gap to a block.
            // <block type="math_arithmetic" gap="8"></block>
            var newGap = parseInt(xml.getAttribute("gap"), 10);
            // Ignore gaps before the first block.
            if (!isNaN(newGap) && this.gaps.length > 0) {
              this.gaps[this.gaps.length - 1] = newGap;
            } else {
              this.gaps.push(default_gap);
            }
          } else if (tagName == "LABEL" && xml.getAttribute("showStatusButton") == "true") {
            var curButton = new Blockly.FlyoutExtensionCategoryHeader(this.workspace_, this.targetWorkspace_, xml);
            this.contents.push({ type: "button", button: curButton });
            this.gaps.push(default_gap);
          } else if (tagName == "BUTTON" || tagName == "LABEL") {
            // Labels behave the same as buttons, but are styled differently.
            var isLabel = tagName == "LABEL";
            var curButton = new Blockly.FlyoutButton(this.workspace_, this.targetWorkspace_, xml, isLabel);
            this.contents.push({ type: "button", button: curButton });
            this.gaps.push(default_gap);
          }
        }
      }

      this.emptyRecycleBlocks_();

      this.layout_(this.contents, this.gaps);
      // IE 11 is an incompetent browser that fails to fire mouseout events.
      // When the mouse is over the background, deselect all blocks.
      var deselectAll = function () {
        var topBlocks = this.workspace_.getTopBlocks(false);
        for (var i = 0, block; (block = topBlocks[i]); i++) {
          block.removeSelect();
        }
      };

      this.listeners_.push(Blockly.bindEvent_(this.svgBackground_, "mouseover", this, deselectAll));

      this.listeners_.push(Blockly.bindEvent_(this.input_, "input", this, this.onInput_));

      this.workspace_.setResizesEnabled(true);
      this.reflow();

      // Correctly position the flyout's scrollbar when it opens.
      this.position();

      this.reflowWrapper_ = this.reflow.bind(this);
      this.workspace_.addChangeListener(this.reflowWrapper_);

      this.recordCategoryScrollPositions_();
    }

    onInput_() {
      const variables = this.targetWorkspace_.getAllVariables();
      let inputValue = this.input_.value;
      const showContents = [];
      const additionalBlocks = [];
      const gaps = [...this.gaps];
      for (const item of this.contents) {
        if (item.type === "block") {
          let i = 0;
          let index = -1;
          let valid = true;
          const inputSplit = inputValue.split(" ");

          const validateField = (field) => {
            const cloneBlock = () => {
              var xml = Blockly.Xml.blockToDom(item.block);
              var block = Blockly.Xml.domToBlock(xml, this.workspace_);

              const newItem = { type: "block", block };
              showContents.push(newItem);
              additionalBlocks.push(newItem);
              // todo
              gaps.push(12);
            };
            const variableSelector = field.argType_.includes("variable");
            if (field.argType_.includes("dropdown") || variableSelector) {
              let valid = false;
              const menuOptions = Array.isArray(field.menuGenerator_) ? field.menuGenerator_ : field.menuGenerator_();
              menuOptions.forEach(([name, id], j) => {
                // Options like "Delete this variable" exist. Those can't actually be options.
                // The "record..." option also has a function an id.
                if ((variableSelector && !variables.some((v) => v.getId() === id)) || typeof id !== "string") return;
                if (i === inputSplit.length) {
                  if (valid && inputValue.length > 0 && j - 1 !== menuOptions.length) {
                    cloneBlock();
                  }
                  field.setValue(id);
                  valid = true;
                } else if (name.includes(inputSplit[i])) {
                  // already found a valid result
                  if (valid) {
                    cloneBlock();
                  }
                  field.setValue(id);
                  valid = true;
                }
              })
              if (i < inputSplit.length) iterate();
              return valid;
            } else if (i < inputSplit.length) {
              if (field.argType_.includes("number") && isNaN(inputSplit[i])) {
                iterate();
                return false;
              } else {
                // TODO: not sure why we are currently getting an error now
                if (!field.argType_.includes("colour")) {
                  field.setValue(inputSplit[i]);
                }
                iterate();
              }
            }
            return true;
          };

          const iterate = () => {
            index = i;
            i++;
            while (inputSplit[i] === "") {
              i++;
            }
          };

          main: for (const input of item.block.inputList) {
            for (const field of input.fieldRow) {
              if (field instanceof Blockly.FieldDropdown) {
                valid = validateField(field);
                if (!valid) break main;
              } else {
                for (const string of field.text_.split(" ")) {
                  if (i === inputSplit.length) continue;
                  if (!string.includes(inputSplit[i]) && i === index + 1) {
                    valid = false;
                    break main;
                  }
                  iterate();
                }
              }
            }
            if (input.connection) {
              const { targetConnection } = input.connection;
              if (targetConnection) {
                const field = targetConnection.sourceBlock_.inputList[0].fieldRow[0];
                valid = validateField(field);
                if (!valid || i === inputSplit.length) break main;
              }
            }
          }
          if (i < inputSplit.length) valid = false;

          if (valid) {
            showContents.push(item);
          }
        }
      }
      this.layout_(showContents, gaps, additionalBlocks);
      this.scrollToStart();
    }

    emptyRecycleBlocks_() {
      // Clean out the old recycle bin.
      // var oldBlocks = this.recycleBlocks_;
      // this.recycleBlocks_ = [];
      // for (var i = 0; i < oldBlocks.length; i++) {
      //   oldBlocks[i].dispose(false, false);
      // }
    }

    layout_(contents, gaps, additionalContents = []) {
      var margin = this.MARGIN;
      var flyoutWidth = this.getWidth() / this.workspace_.scale;
      var cursorX = margin;
      var cursorY = margin;

      const doItem = (item) => {
        if (item.type == "block") {
          var block = item.block;
          if (!contents.includes(item)) {
            block.svgGroup_.style.display = "none";
            if (block.flyoutRect_) {
              block.flyoutRect_.style.display = "none";
            }
            return;
          } else {
            block.svgGroup_.style.display = "block";
            if (block.flyoutRect_) {
              block.flyoutRect_.style.display = "block";
            }
          }

          var allBlocks = block.getDescendants(false);
          for (var j = 0, child; (child = allBlocks[j]); j++) {
            // Mark blocks as being inside a flyout.  This is used to detect and
            // prevent the closure of the flyout if the user right-clicks on such a
            // block.
            child.isInFlyout = true;
          }
          var root = block.getSvgRoot();
          var blockHW = block.getHeightWidth();

          // Figure out where the block goes, taking into account its size, whether
          // we're in RTL mode, and whether it has a checkbox.
          var { x: oldX, y: oldY } = block.getRelativeToSurfaceXY();
          var newX = flyoutWidth - this.MARGIN;

          var moveX = this.RTL ? newX : margin;
          var moveY = cursorY + (block.startHat_ ? Blockly.BlockSvg.START_HAT_HEIGHT : 0);

          // The block moves a bit extra for the hat, but the block's rectangle
          // doesn't. That's because the hat actually extends up from 0.
          block.moveBy(moveX - oldX, moveY - oldY);

          if (!block.flyoutRect_) {
            this.createRect_(block, this.RTL ? moveX - blockHW.width : moveX, cursorY, blockHW, i);
          }

          if (!block.bindedListeners) {
            this.addBlockListeners_(root, block, block.flyoutRect_);
          }

          cursorY += blockHW.height + gaps[i] + (block.startHat_ ? Blockly.BlockSvg.START_HAT_HEIGHT : 0);
        } else if (item.type == "button") {
          var button = item.button;
          var buttonSvg = button.createDom();
          if (this.RTL) {
            button.moveTo(flyoutWidth - this.MARGIN - button.width, cursorY);
          } else {
            button.moveTo(cursorX, cursorY);
          }
          button.show();
          // Clicking on a flyout button or label is a lot like clicking on the
          // flyout background.
          this.listeners_.push(Blockly.bindEventWithChecks_(buttonSvg, "mousedown", this, this.onMouseDown_));

          this.buttons_.push(button);
          cursorY += button.height + gaps[i];
        }
      };

      for (var i = 0, item; (item = this.contents[i]); i++) {
        doItem(item);
      }
      this.additionalBlocks.forEach((item) => doItem(item));
      additionalContents.forEach((item) => doItem(item));
      this.additionalBlocks = additionalContents;
    }

    createRect_(block, x, y, blockHW, index) {
      // Create an invisible rectangle under the block to act as a button.  Just
      // using the block as a button is poor, since blocks have holes in them.
      var rect = Blockly.utils.createSvgElement(
        "rect",
        {
          "fill-opacity": 0,
          x: x,
          y: y,
          height: blockHW.height,
          width: blockHW.width,
        },
        null
      );
      rect.tooltip = block;
      Blockly.Tooltip.bindMouseEvents(rect);
      // Add the rectangles under the blocks, so that the blocks' tooltips work.
      this.workspace_.getCanvas().insertBefore(rect, block.getSvgRoot());

      block.flyoutRect_ = rect;
      this.backgroundButtons_[index] = rect;
      return rect;
    }

    addBlockListeners_(root, block, rect) {
      this.listeners_.push(Blockly.bindEventWithChecks_(root, "mousedown", null, this.blockMouseDown_(block)));
      this.listeners_.push(Blockly.bindEventWithChecks_(rect, "mousedown", null, this.blockMouseDown_(block)));
      this.listeners_.push(Blockly.bindEvent_(root, "mouseover", block, block.addSelect));
      this.listeners_.push(Blockly.bindEvent_(root, "mouseout", block, block.removeSelect));
      this.listeners_.push(Blockly.bindEvent_(rect, "mouseover", block, block.addSelect));
      this.listeners_.push(Blockly.bindEvent_(rect, "mouseout", block, block.removeSelect));
      block.bindedListeners = true;
    }

    blockMouseDown_(block) {
      var flyout = this;
      return function (e) {
        var gesture = flyout.targetWorkspace_.getGesture(e);
        if (gesture) {
          gesture.setStartBlock(block);
          gesture.handleFlyoutStart(e, flyout);
        }
      };
    }

    clearOldBlocks_() {
      // Delete any blocks from a previous showing.
      var oldBlocks = this.workspace_.getTopBlocks(false);
      for (var i = 0, block; (block = oldBlocks[i]); i++) {
        if (block.workspace == this.workspace_) {
          block.dispose(false, false);
        }
      }
      // Delete any background buttons from a previous showing.
      for (var j = 0; j < this.backgroundButtons_.length; j++) {
        var rect = this.backgroundButtons_[j];
        if (rect) rect.remove();
      }
      this.backgroundButtons_.length = 0;

      for (var i = 0, button; (button = this.buttons_[i]); i++) {
        button.dispose();
      }
      this.buttons_.length = 0;

      // Clear potential variables from the previous showing.
      this.workspace_.getPotentialVariableMap().clear();
    }

    reflow() {
      if (this.reflowWrapper_) {
        this.workspace_.removeChangeListener(this.reflowWrapper_);
      }
      var blocks = this.workspace_.getTopBlocks(false);
      // this.reflowInternal_(blocks);
      if (this.reflowWrapper_) {
        this.workspace_.addChangeListener(this.reflowWrapper_);
      }
    }

    dispose() {
      this.hide();
      Blockly.unbindEvent_(this.eventWrappers_);
      if (this.scrollbar_) {
        this.scrollbar_.dispose();
        this.scrollbar_ = null;
      }
      if (this.workspace_) {
        this.workspace_.targetWorkspace = null;
        this.workspace_.dispose();
        this.workspace_ = null;
      }
      if (this.svgGroup_) {
        this.svgGroup_.remove();
        this.svgGroup_ = null;
      }
      if (this.input_) {
        this.input_.remove();
        this.input_ = null;
      }
      this.parentToolbox_ = null;
      this.svgBackground_ = null;
      this.targetWorkspace_ = null;
    }

    getWorkspace() {
      return this.workspace_;
    }

    createBlock(originalBlock) {
      var newBlock = null;
      Blockly.Events.disable();
      var variablesBeforeCreation = this.targetWorkspace_.getAllVariables();
      this.targetWorkspace_.setResizesEnabled(false);
      try {
        newBlock = this.placeNewBlock_(originalBlock);
        // Close the flyout.
        Blockly.hideChaff();
      } finally {
        Blockly.Events.enable();
      }

      var newVariables = Blockly.Variables.getAddedVariables(this.targetWorkspace_, variablesBeforeCreation);

      if (Blockly.Events.isEnabled()) {
        Blockly.Events.setGroup(true);
        Blockly.Events.fire(new Blockly.Events.Create(newBlock));
        // Fire a VarCreate event for each (if any) new variable created.
        for (var i = 0; i < newVariables.length; i++) {
          var thisVariable = newVariables[i];
          Blockly.Events.fire(new Blockly.Events.VarCreate(thisVariable));
        }
      }
      if (this.autoClose) {
        this.hide();
      }
      return newBlock;
    }

    recycleBlock_(block) {
      var xy = block.getRelativeToSurfaceXY();
      block.moveBy(-xy.x, -xy.y);
      this.recycleBlocks_.push(block);
    }

    placeNewBlock_(oldBlock) {
      var targetWorkspace = this.targetWorkspace_;
      var svgRootOld = oldBlock.getSvgRoot();
      if (!svgRootOld) {
        throw "oldBlock is not rendered.";
      }

      // Create the new block by cloning the block in the flyout (via XML).
      var xml = Blockly.Xml.blockToDom(oldBlock);
      // The target workspace would normally resize during domToBlock, which will
      // lead to weird jumps.  Save it for terminateDrag.
      targetWorkspace.setResizesEnabled(false);

      // Using domToBlock instead of domToWorkspace means that the new block will be
      // placed at position (0, 0) in main workspace units.
      var block = Blockly.Xml.domToBlock(xml, targetWorkspace);
      var svgRootNew = block.getSvgRoot();
      if (!svgRootNew) {
        throw "block is not rendered.";
      }

      // The offset in pixels between the main workspace's origin and the upper left
      // corner of the injection div.
      var mainOffsetPixels = targetWorkspace.getOriginOffsetInPixels();

      // The offset in pixels between the flyout workspace's origin and the upper
      // left corner of the injection div.
      var flyoutOffsetPixels = this.workspace_.getOriginOffsetInPixels();

      // The position of the old block in flyout workspace coordinates.
      var oldBlockPosWs = oldBlock.getRelativeToSurfaceXY();

      // The position of the old block in pixels relative to the flyout
      // workspace's origin.
      var oldBlockPosPixels = oldBlockPosWs.scale(this.workspace_.scale);

      // The position of the old block in pixels relative to the upper left corner
      // of the injection div.
      var oldBlockOffsetPixels = flyoutOffsetPixels.translate(oldBlockPosPixels.x, oldBlockPosPixels.y);

      // The position of the old block in pixels relative to the origin of the
      // main workspace.
      var finalOffsetPixels = oldBlockOffsetPixels.translate(mainOffsetPixels.x, mainOffsetPixels.y);

      // The position of the old block in main workspace coordinates.
      var finalOffsetMainWs = finalOffsetPixels.scale(1 / targetWorkspace.scale);

      block.moveBy(finalOffsetMainWs.x, finalOffsetMainWs.y);
      return block;
    }

    wheel_(e) {
      // remove scrollTarget to stop auto scrolling in stepScrollAnimation
      this.scrollTarget = null;

      var delta = e.deltaY;

      if (delta) {
        // Firefox's mouse wheel deltas are a tenth that of Chrome/Safari.
        // DeltaMode is 1 for a mouse wheel, but not for a trackpad scroll event
        // TODO
        // if (goog.userAgent.GECKO && (e.deltaMode === 1)) {
        //   delta *= 10;
        // }
        var metrics = this.getMetrics_();
        var pos = metrics.viewTop - metrics.contentTop + delta;
        var limit = metrics.contentHeight - metrics.viewHeight;
        pos = Math.min(pos, limit);
        pos = Math.max(pos, 0);
        this.scrollbar_.set(pos);
        // When the flyout moves from a wheel event, hide WidgetDiv and DropDownDiv.
        Blockly.WidgetDiv.hide(true);
        Blockly.DropDownDiv.hideWithoutAnimation();
      }

      // Don't scroll the page.
      e.preventDefault();
      // Don't propagate mousewheel event (zooming).
      e.stopPropagation();
    }

    onMouseDown_(e) {
      var gesture = this.targetWorkspace_.getGesture(e);
      if (gesture) {
        gesture.handleFlyoutStart(e, this);
      }
    }

    stepScrollAnimation() {
      if (!this.scrollTarget) {
        return;
      }
      var scrollPos = this.horizontalLayout_ ? -this.workspace_.scrollX : -this.workspace_.scrollY;
      var diff = this.scrollTarget - scrollPos;
      if (Math.abs(diff) < 1) {
        this.scrollbar_.set(this.scrollTarget);
        this.scrollTarget = null;
        return;
      }
      this.scrollbar_.set(scrollPos + diff * this.scrollAnimationFraction);

      // Polyfilled by goog.dom.animationFrame.polyfill
      requestAnimationFrame(this.stepScrollAnimation.bind(this));
    }

    getScrollPos() {
      var pos = this.horizontalLayout_ ? -this.workspace_.scrollX : -this.workspace_.scrollY;
      return pos / this.workspace_.scale;
    }
  }

  const workspace = Blockly.getMainWorkspace();
  const popup = new MiddleClickPopup(workspace);
  let mouse = { x: 0, y: 0 };

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key == " ") {
      popup.show(mouse.x, mouse.y);
    }
  });

  const oldBindMouseEvents = Blockly.Gesture.prototype.bindMouseEvents;
  Blockly.Gesture.prototype.bindMouseEvents = function (e) {
    oldBindMouseEvents.call(this, e);
    if (e.button === 1) {
      popup.show(e.clientX, e.clientY);
    } else {
      if (this.flyout_ === popup) return;
      popup.hide();
    }
  };

  document.addEventListener("mousemove", (e) => {
    mouse = { x: e.clientX, y: e.clientY };
  });
}
