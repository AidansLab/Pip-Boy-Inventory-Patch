// invPatchIndivDitherV45.js (Final Version w/ Navigation Fix & UI Tweak)

(function() {
  // --- Configuration & Constants ---
  const LIST_START_Y = 10, LIST_LINE_HEIGHT = 22, STATS_BOX_X = 220, STATS_BOX_BOTTOM_Y = 205;
  const STATS_BOX_WIDTH = 170, STATS_PADDING = 8, STAT_LINE_HEIGHT = 20, TEXT_COLOR = 3, BRIGHT_BG_COLOR = 1, DITHER_COLOR = 1;
  const ICONS = {
    attack: atob("Hh6BAAADAAAADAAAADAAAADAAAADAAAAf4AAB/+AADjHAAGDBgAMAAwAMAAwAYAAYAYAAYAYAAYP+AB//+AB/wYAAYAYAAYAYAAYAMAAwAMAAwAGDBgADjHAAB/+AAAf4AAADAAAADAAAADAAAADAAAADAAA"),
    bleed: atob("BwyBAAAgQcPLl8/f/fHA"), energy: atob("BwyBADzx44ffvwwwYIAA"), fire: atob("CgyBAAgCAZB8X7/vu8fhsGYYAA=="),
    frost: atob("Dw+BAAEAAgAVABwAEASpBOR//xOQSpAEABwAVAAgAEAA"), rad: atob("EA+BABAIOBx8Pnw+/n7+f/2/AYAAAAGAA8AH4AfgD/ADwA=="),
    ammo: atob("EhOBAAAAB/53/5//53/5x/5wAAB/53/5//53/5x/5wAAB/53/5//53/5x/5wAAA="), time: atob("FRWBAAA8AAP4AAngAMOABg4CMDkMgNgwBsDgHgfA8B4HgPA8AwGgABmAAM4ADjAA4OAOA8HgD/4AD4AA"),
    shield: atob("DxKBAP/9h/oH9A/oH9A/oH9h/v/9/gv8F/gv8E/hn8YPmA/gBwA=")
  };
  
  // --- State ---
  var inventory = [], fileList = [], pageCounts = [], totalItems = 0, currentPageIndex = -1;
  var selectedItemGlobalIndex = 0, lastSelectedItemGlobalIndex = -1;
  var equippedGear = { weapon: null, hat: null, eyewear: null, mask: null, clothing: null, chest: null, leftArm: null, rightArm: null, leftLeg: null, rightLeg: null, accessory: null };
  var currentItemImage = null, isItemSoundPlaying = false;

  // --- Functions ---
  function drawDitheredRect(x, y, w, h) {
    bC.setColor(DITHER_COLOR);
    for (var j = y; j < y + h; j += 2) { bC.fillRect(x, j, x + w, j); }
  }

  function loadMetadata() {
    try {
      var meta = JSON.parse(fs.readFileSync("DATA/items_meta.json"));
      pageCounts = meta.pageCounts;
      totalItems = 0;
      for (var i = 0; i < pageCounts.length; i++) { totalItems += pageCounts[i]; }
      fileList = [];
      for (var j = 0; j < pageCounts.length; j++) { fileList.push("items_" + j + ".json"); }
    } catch (e) {
      totalItems = 0;
    }
  }

  function loadPage(pIdx) {
    if (pIdx < 0 || pIdx >= fileList.length || currentPageIndex === pIdx) return false;
    try {
      inventory = JSON.parse(fs.readFileSync("DATA/" + fileList[pIdx]));
      currentPageIndex = pIdx;
      return true;
    } catch (e) { inventory = []; return false; }
  }

  function getPageAndLocalIndex(gIdx) {
    if (totalItems === 0) return { page: 0, local: 0 };
    gIdx = (gIdx % totalItems + totalItems) % totalItems;
    var itemsScanned = 0;
    for (var i = 0; i < pageCounts.length; i++) {
      if (gIdx < itemsScanned + pageCounts[i]) return { page: i, local: gIdx - itemsScanned };
      itemsScanned += pageCounts[i];
    }
    return { page: 0, local: 0 };
  }
  
  function loadItemImage(item) {
    currentItemImage = null; 
    if (item && item.image) {
      try {
        var fileContent = fs.readFileSync("DATA/" + item.image);
        var imageObject = eval('(' + fileContent + ')');
        imageObject.buffer = E.toArrayBuffer(imageObject.buffer);
        currentItemImage = imageObject;
      } catch (e) { /* Silently fail on image load error */ }
    }
  }
  
  function drawStatGroup(stats, label, yOffset, statsBoxY) {
    if (!stats || stats.length === 0) return yOffset;
    var maxValBoxWidth = 0;
    stats.forEach(function(stat) {
      var icon = ICONS[stat.type];
      var statValueWidth = bC.stringWidth(stat.value);
      var iconWidth = 0;
      if (icon) {
        var iconDimensions = g.imageMetrics(icon);
        var targetHeight = (stat.type === 'attack' && label === "Damage") ? 15 : 14;
        var scale = targetHeight / iconDimensions.height;
        iconWidth = iconDimensions.width * scale;
      }
      maxValBoxWidth = Math.max(maxValBoxWidth, statValueWidth + iconWidth + 20);
    });
    var valueStartPosition = STATS_BOX_X + STATS_BOX_WIDTH - maxValBoxWidth;
    var totalGroupHeight = stats.length * STAT_LINE_HEIGHT;
    var firstLineY = statsBoxY + STATS_PADDING + yOffset;
    bC.setColor(BRIGHT_BG_COLOR);
    bC.fillRect(STATS_BOX_X + 4, firstLineY - 2, valueStartPosition - 4, firstLineY + totalGroupHeight - 4);
    bC.setBgColor(BRIGHT_BG_COLOR);
    bC.setColor(TEXT_COLOR);
    
    bC.drawString(label, STATS_BOX_X + STATS_PADDING, firstLineY);

    stats.forEach(function(stat) {
      var lineY = statsBoxY + STATS_PADDING + yOffset;
      var icon = ICONS[stat.type];
      bC.setColor(BRIGHT_BG_COLOR);
      bC.fillRect(valueStartPosition, lineY - 2, STATS_BOX_X + STATS_BOX_WIDTH - 4, lineY + STAT_LINE_HEIGHT - 4);
      bC.setBgColor(BRIGHT_BG_COLOR);
      bC.setColor(TEXT_COLOR);
      if (icon) {
        var iconDimensions = g.imageMetrics(icon);
        var targetHeight = (stat.type === 'attack' && label === "Damage") ? 15 : 14;
        var scale = targetHeight / iconDimensions.height;
        var iconY = (lineY) + ((STAT_LINE_HEIGHT - 4) - (iconDimensions.height * scale)) / 2;
        bC.drawImage(icon, valueStartPosition + 2, iconY, { scale: scale });
      }
      bC.setFontAlign(1, -1);
      bC.drawString(stat.value, STATS_BOX_X + STATS_BOX_WIDTH - STATS_PADDING, lineY);
      bC.setFontAlign(-1, -1);
      yOffset += STAT_LINE_HEIGHT;
    });
    return yOffset;
  }
  
  function renderItemStats(item) {
    bC.setFontMonofonto16();
    if (!item) return;
    var statCount = (item.damages ? item.damages.length : 0) + (item.defenses ? item.defenses.length : 0) + (item.stats ? Object.keys(item.stats).length : 0);
    if (statCount === 0) return;
    var statsBoxHeight = (statCount * STAT_LINE_HEIGHT) + (STATS_PADDING * 2) - 2;
    var statsBoxY = STATS_BOX_BOTTOM_Y - statsBoxHeight;
    var yOffset = 0;
    yOffset = drawStatGroup(item.damages, "Damage", yOffset, statsBoxY);
    yOffset = drawStatGroup(item.defenses, "DMG Resist", yOffset, statsBoxY);
    if (item.stats) {
      for (var statName in item.stats) {
        var lineY = statsBoxY + STATS_PADDING + yOffset;
        var statEntry = item.stats[statName];
        var isComplexStat = typeof statEntry === 'object' && statEntry !== null;
        var statValue = isComplexStat ? statEntry.value : statEntry;
        var hasTimeIndicator = isComplexStat && statEntry.isTimed;
        var isImportantStat = (statName === item.ammoType);
        if (isImportantStat) {
          bC.setColor(BRIGHT_BG_COLOR);
          bC.fillRect(STATS_BOX_X + 4, lineY, STATS_BOX_X + STATS_BOX_WIDTH - 4, lineY + STAT_LINE_HEIGHT - 4);
          bC.setBgColor(BRIGHT_BG_COLOR);
        } else {
          drawDitheredRect(STATS_BOX_X + 4, lineY, STATS_BOX_WIDTH - 8, STAT_LINE_HEIGHT - 2);
          bC.setBgColor(0);
        }
        bC.setColor(TEXT_COLOR);
        var valueX = STATS_BOX_X + STATS_BOX_WIDTH - STATS_PADDING;
        if (isImportantStat) {
            var textX = STATS_BOX_X + STATS_PADDING;
            if (ICONS.ammo) {
                var iconDimensions = g.imageMetrics(ICONS.ammo);
                var scale = 14 / iconDimensions.height;
                var iconY = lineY + ((STAT_LINE_HEIGHT - 4) - (iconDimensions.height * scale)) / 2;
                bC.drawImage(ICONS.ammo, textX, iconY, { scale: scale });
            }
            textX += 16;
            bC.drawString(statName, textX, lineY);
        } else {
            bC.drawString(statName, STATS_BOX_X + STATS_PADDING, lineY);
        }
        bC.setFontAlign(1, -1);
        bC.drawString(statValue, valueX, lineY);
        if (hasTimeIndicator) {
            var iconDimensions = g.imageMetrics(ICONS.time);
            var scale = 14 / iconDimensions.height;
            var iconY = (lineY - 1) + ((STAT_LINE_HEIGHT - 4) - (iconDimensions.height * scale)) / 2;
            var iconX = valueX - bC.stringWidth(statValue) - (iconDimensions.width * scale) - 7;
            bC.drawImage(ICONS.time, iconX, iconY, { scale: scale });
        }
        bC.setFontAlign(-1, -1);
        yOffset += STAT_LINE_HEIGHT;
      }
    }
  }
  
  function drawItem(localIndex, selectedLocalIndex) {
    const item = inventory[localIndex];
    const y = LIST_START_Y + localIndex * LIST_LINE_HEIGHT;
    const xStart = 23;
    const maxWidth = (STATS_BOX_X - 15) - xStart;

    bC.setBgColor(localIndex === selectedLocalIndex ? 3 : 0);
    bC.setColor(localIndex === selectedLocalIndex ? 0 : 3);
    bC.clearRect(10, y, STATS_BOX_X - 10, y + LIST_LINE_HEIGHT - 1);
    bC.setFontMonofonto16();

    if (Object.values(equippedGear).includes(item.name)) {
      bC.fillRect(12, y + 8, 18, y + 14);
    }

    const quantityStr = " (" + item.quantity + ")";
    const quantityWidth = bC.stringWidth(quantityStr);
    let nameStr = item.name;
    const availableNameWidth = maxWidth - quantityWidth;

    if (bC.stringWidth(nameStr) > availableNameWidth) {
        let truncatedName = "";
        for (let i = 0; i < nameStr.length; i++) {
            if (bC.stringWidth(truncatedName + nameStr[i] + "...") > availableNameWidth) {
                break;
            }
            truncatedName += nameStr[i];
        }
        nameStr = truncatedName + "...";
    }
    
    bC.drawString(nameStr + quantityStr, xStart, y + 3);
  }

  function renderFull() {
    if (totalItems === 0) {
        bC.clear(1).setFontMonofonto18().setColor(3).drawString("Inventory empty.", 25, LIST_START_Y + 3).flip();
        return;
    }
    var currentPos = getPageAndLocalIndex(selectedItemGlobalIndex);
    loadItemImage(inventory[currentPos.local]);
    bC.clear(1);
    if (currentItemImage) { bC.drawImage(currentItemImage, STATS_BOX_X + 20, 20); }
    for (var i = 0; i < inventory.length; i++) { drawItem(i, currentPos.local); }
    renderItemStats(inventory[currentPos.local]);
    bC.flip();
  }
  
  function onKnob(dir) {
    if (isItemSoundPlaying) {
      if (Pip.audioIsPlaying()) {
        return;
      } else {
        isItemSoundPlaying = false;
      }
    }
    
    var currentPos = getPageAndLocalIndex(selectedItemGlobalIndex);
    var item = totalItems > 0 ? inventory[currentPos.local] : null;

    if (dir === 0) {
      if (!item) return;
      if (item.type === 'weapon' || item.type === 'apparel') {
        isItemSoundPlaying = true;
        var slots = Object.prototype.toString.call(item.equipSlots) === '[object Array]' ? item.equipSlots : [item.equipSlots];
        
        if (slots.length > 0 && Array.isArray(slots[0])) {
          slots = slots[0];
        }

        var isEquipped = equippedGear[slots[0]] === item.name;
        var soundFile;
        var sounds;

        if (item.type === 'weapon') {
            sounds = isEquipped ? 
                ["EquipDown_01.wav", "EquipDown_02.wav", "EquipDown_03.wav"] : 
                ["EquipUp_02.wav", "EquipUp_03.wav"];
        } else { // apparel
            sounds = isEquipped ? 
                ["EquipDown_01.wav", "EquipDown_02.wav", "EquipDown_03.wav"] : 
                ["EquipUp_01.wav"];
        }
        soundFile = sounds[Math.floor(Math.random() * sounds.length)];

        if (isEquipped) {
          slots.forEach(function(s) { equippedGear[s] = null; });
        } else {
          var itemsToUnequip = [];
          slots.forEach(function(s) {
            var itemName = equippedGear[s];
            if (itemName && itemsToUnequip.indexOf(itemName) === -1) {
              itemsToUnequip.push(itemName);
            }
          });

          if (itemsToUnequip.length > 0) {
            for (var slot in equippedGear) {
              if (itemsToUnequip.indexOf(equippedGear[slot]) !== -1) {
                equippedGear[slot] = null;
              }
            }
          }

          slots.forEach(function(s) {
            equippedGear[s] = item.name;
          });
        }

        if (soundFile) Pip.audioStart("DATA/" + soundFile);
        renderFull();
      } else if (item.sounds && item.sounds.length > 0) {
        isItemSoundPlaying = true;
        Pip.audioStart("DATA/" + item.sounds[Math.floor(Math.random() * item.sounds.length)]);
      }
      return;
    }
    
    if (totalItems <= 1) return;
    
    Pip.knob1Click(dir);

    lastSelectedItemGlobalIndex = selectedItemGlobalIndex;
    selectedItemGlobalIndex -= dir;
    selectedItemGlobalIndex = (selectedItemGlobalIndex % totalItems + totalItems) % totalItems;
    
    if (selectedItemGlobalIndex === lastSelectedItemGlobalIndex) return;

    var oldPos = getPageAndLocalIndex(lastSelectedItemGlobalIndex);
    var newPos = getPageAndLocalIndex(selectedItemGlobalIndex);
    
    var pageChanged = newPos.page !== oldPos.page;

    if (pageChanged) {
        loadPage(newPos.page);
        renderFull();
    } else {
        loadItemImage(inventory[newPos.local]);
        bC.setBgColor(0);
        bC.clearRect(STATS_BOX_X, 0, bC.getWidth(), bC.getHeight());
        if (currentItemImage) bC.drawImage(currentItemImage, STATS_BOX_X + 20, 20);
        drawItem(oldPos.local, newPos.local);
        drawItem(newPos.local, newPos.local);
        renderItemStats(inventory[newPos.local]);
        bC.flip();
    }
  }

  function start() {
    loadMetadata();
    if (totalItems > 0) {
      loadPage(0);
      selectedItemGlobalIndex = 0;
    }
    renderFull();
    Pip.on("knob1", onKnob);
    Pip.removeSubmenu = function() { Pip.removeListener("knob1", onKnob); };
  }

  if (MODEINFO[2] && MODEINFO[2].submenu) {
    var originalSubmenu = MODEINFO[2].submenu;
    var newSubmenu = {};
    var inserted = false;
    for (var key in originalSubmenu) {
      if (key === "ATTACHMENTS") {
        newSubmenu["ITEMS"] = start;
        inserted = true;
      }
      newSubmenu[key] = originalSubmenu[key];
    }
    if (!inserted) newSubmenu["ITEMS"] = start;
    MODEINFO[2].submenu = newSubmenu;
  }
})();