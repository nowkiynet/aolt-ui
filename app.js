(() => {
  // =========================
  // 1) Constants (match Java-ish)
  // =========================
  const WINDOW_W = 252, WINDOW_H = 140;
  const INSIDE_X = 9, INSIDE_Y = 18;
  const INSIDE_W = 234, INSIDE_H = 113;
  const TITLE_X = 8, TITLE_Y = 6;

  const PANEL_COLS = 9;
  const SLOT_SIZE = 18;
  const PANEL_HEADER_H = 12;
  const PANEL_PADDING = 4;
  const PANEL_SPACING = 8;

  const GRID_COLS = 5;
  const WIDGET_W = 26;
  const WIDGET_STEP_X = 28;
  const WIDGET_STEP_Y = 27;

  const HOLD_MS = 1500;

  const PAD = 32;
  const ORGX = PAD;
  const ORGY = PAD;

  const CANVAS_W = WINDOW_W + PAD * 2;
  const CANVAS_H = WINDOW_H + PAD * 2;

  // =========================
  // 2) Tabs layout
  // =========================
  const TAB_TYPES = [
    {
      name: "ABOVE", width: 28, height: 32, max: 8,
      getX: i => (28 + 4) * i,
      getY: _ => -32 + 4,
      sprites: {
        unselected: { first:"tab_above_left", middle:"tab_above_middle", last:"tab_above_right" },
        selected:   { first:"tab_above_left_selected", middle:"tab_above_middle_selected", last:"tab_above_right_selected" }
      },
      iconOffset: { x: 6, y: 9 }
    },
    {
      name: "BELOW", width: 28, height: 32, max: 8,
      getX: i => (28 + 4) * i,
      getY: _ => 136,
      sprites: {
        unselected: { first:"tab_below_left", middle:"tab_below_middle", last:"tab_below_right" },
        selected:   { first:"tab_below_left_selected", middle:"tab_below_middle_selected", last:"tab_below_right_selected" }
      },
      iconOffset: { x: 6, y: 6 }
    },
    {
      name: "LEFT", width: 32, height: 28, max: 5,
      getX: _ => -32 + 4,
      getY: i => 28 * i,
      sprites: {
        unselected: { first:"tab_left_top", middle:"tab_left_middle", last:"tab_left_bottom" },
        selected:   { first:"tab_left_top_selected", middle:"tab_left_middle_selected", last:"tab_left_bottom_selected" }
      },
      iconOffset: { x: 10, y: 5 }
    },
    {
      name: "RIGHT", width: 32, height: 28, max: 5,
      getX: _ => 248,
      getY: i => 28 * i,
      sprites: {
        unselected: { first:"tab_right_top", middle:"tab_right_middle", last:"tab_right_bottom" },
        selected:   { first:"tab_right_top_selected", middle:"tab_right_middle_selected", last:"tab_right_bottom_selected" }
      },
      iconOffset: { x: 6, y: 5 }
    },
  ];

  const CATEGORY_ICON_KEY = {
    ARCHAEOLOGY:      "icon_brush",
    INTERACTION:      "icon_shears",
    GENERATED_LOOT:   "icon_chest",
    MONSTER:          "icon_zombie_spawn_egg",
    FISHING:          "icon_fishing_rod",
    GIFTS:            "icon_emerald",
    PIGLIN_BARTERING: "icon_gold_ingot",
  };

  // =========================
  // 3) Canvas setup
  // =========================
  const canvas = document.getElementById("ui");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = "top";

  function applyScale() {
    const maxW = Math.min(window.innerWidth - 40, 1100);
    const maxH = window.innerHeight - 120;
    const s = Math.max(2, Math.min(6, Math.floor(maxW / CANVAS_W), Math.floor(maxH / CANVAS_H)));

    canvas.style.width  = (CANVAS_W * s) + "px";
    canvas.style.height = (CANVAS_H * s) + "px";

    // Physical resolution
    canvas.width  = CANVAS_W * s;
    canvas.height = CANVAS_H * s;

    // Logical coordinates
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  applyScale();
  window.addEventListener("resize", applyScale);

  // =========================
  // 4) Assets (CORE + LAZY)
  // =========================
  // !!! Wichtig: NUR raw.githubusercontent.com / direkte raw URLs nutzen.
  // "github.com/.../blob" ist oft HTML -> führt zu falschen Größen / Stretch / Fail.
  const CORE_ASSETS = {
    window: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/advancements/window.png",
    slot: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/container/slot.png",
    confirm: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/container/beacon/confirm.png",
    bgDefault: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/blocks/deepslate_tiles.png",

    // Tabs: ABOVE
    tab_above_left: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_left.png",
    tab_above_middle: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_middle.png",
    tab_above_right: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_right.png",
    tab_above_left_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_left_selected.png",
    tab_above_middle_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_middle_selected.png",
    tab_above_right_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_above_right_selected.png",

    // Tabs: BELOW
    tab_below_left: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_left.png",
    tab_below_middle: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_middle.png",
    tab_below_right: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_right.png",
    tab_below_left_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_left_selected.png",
    tab_below_middle_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_middle_selected.png",
    tab_below_right_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_below_right_selected.png",

    // Tabs: LEFT
    tab_left_top: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_top.png",
    tab_left_middle: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_middle.png",
    tab_left_bottom: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_bottom.png",
    tab_left_top_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_top_selected.png",
    tab_left_middle_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_middle_selected.png",
    tab_left_bottom_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_left_bottom_selected.png",

    // Tabs: RIGHT
    tab_right_top: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_top.png",
    tab_right_middle: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_middle.png",
    tab_right_bottom: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_bottom.png",
    tab_right_top_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_top_selected.png",
    tab_right_middle_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_middle_selected.png",
    tab_right_bottom_selected: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/tab_right_bottom_selected.png",

    // Frames
    frame_task_unobtained: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/task_frame_unobtained.png",
    frame_task_obtained: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/task_frame_obtained.png",
    frame_challenge_unobtained: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/challenge_frame_unobtained.png",
    frame_challenge_obtained: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/advancements/challenge_frame_obtained.png",

    // Category icons
    icon_brush: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/brush.png",
    icon_shears: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/shears.png",
    icon_chest: "https://minecraft.wiki/images/Invicon_Chest.png",
    icon_zombie_spawn_egg: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/zombie_spawn_egg.png",
    icon_fishing_rod: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/fishing_rod.png",
    icon_emerald: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/emerald.png",
    icon_gold_ingot: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/gold_ingot.png",

    // Back button (23x13)
    back_normal: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/widget/page_backward.png",
    back_hover:  "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/gui/sprites/widget/page_backward_highlighted.png",
  };

  // key -> Image
  const imgs = new Map();
  // url -> Promise<Image> (dedup)
  const pending = new Map();
  const ICON_BATCH_SIZE = 24;

    // =========================
  // Loading overlay state
  // =========================
  const loading = {
    dataTotal: 2,          // defs + state
    dataDone: 0,
    coreTotal: Object.keys(CORE_ASSETS).length,
    coreDone: 0,
    ready: false,
    message: "Booting..."
  };

  function getLoadingProgress01() {
    const total = loading.dataTotal + loading.coreTotal;
    const done  = loading.dataDone  + loading.coreDone;
    return total <= 0 ? 0 : (done / total);
  }

  function drawLoadingOverlay() {
    if (loading.ready) return;

    // Overlay über die gesamte Canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // wichtig: unabhängig von Scale-Transform zeichnen

    // Wir rechnen in "logical" Koordinaten -> skalieren den Overlay-Layer wieder runter
    // (Canvas ist physisch CANVAS_W*s, aber wir wollen in CANVAS_W zeichnen)
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;

    // Zurück auf "logical"
    const logicalScaleX = (canvas.width / CANVAS_W);
    const logicalScaleY = (canvas.height / CANVAS_H);
    ctx.scale(1 / logicalScaleX, 1 / logicalScaleY);

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const p = getLoadingProgress01();
    const pct = Math.floor(p * 100);

    // Minecraft-ish Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    const title = "Loading...";
    ctx.fillText(title, 18, 18);

    ctx.font = "10px monospace";
    ctx.fillText(loading.message, 18, 36);

    // Progressbar
    const barX = 18;
    const barY = 54;
    const barW = CANVAS_W - 36;
    const barH = 10;

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(barX, barY, Math.floor(barW * p), barH);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "10px monospace";
    ctx.fillText(`${pct}%  (core ${loading.coreDone}/${loading.coreTotal}, data ${loading.dataDone}/${loading.dataTotal})`, barX, barY + 16);

    ctx.restore();
  }

  function loadImage(url) {
    if (!url) return Promise.reject(new Error("empty url"));
    if (pending.has(url)) return pending.get(url);

    const p = new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("Failed to load: " + url));
      im.src = url;
    });

    pending.set(url, p);
    return p;
  }

  async function loadAssetEntries(entries, tag = "") {
    await Promise.all(entries.map(async ([k, url]) => {
      if (imgs.has(k)) return;

      try {
        const im = await loadImage(url);
        imgs.set(k, im);

        // progress (core assets)
        if (tag === "core") {
          loading.coreDone = Math.min(loading.coreTotal, loading.coreDone + 1);
          loading.message = "Loading UI textures...";
        }
      } catch (e) {
        console.warn("Asset failed:", k, url, e);

        // auch bei Fehlern "weiterzählen", sonst hängt die Progressbar ewig
        if (tag === "core") {
          loading.coreDone = Math.min(loading.coreTotal, loading.coreDone + 1);
          loading.message = "Loading UI textures...";
        }
      }
    }));
  }

  async function loadCoreAssets() {
    await loadAssetEntries(Object.entries(CORE_ASSETS), "core");
  }

  async function ensureIconsLoaded(urls) {
    if (!urls || urls.length === 0) return;

    const unique = [];
    const seen = new Set();
    for (const u of urls) {
      if (!u) continue;
      if (imgs.has(u)) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      unique.push(u);
    }
    if (!unique.length) return;

    for (let i = 0; i < unique.length; i += ICON_BATCH_SIZE) {
      const slice = unique.slice(i, i + ICON_BATCH_SIZE);
      await Promise.all(slice.map(async (u) => {
        try {
          const im = await loadImage(u);
          imgs.set(u, im);
        } catch {
          // ignore single failures
        }
      }));
      await new Promise(r => setTimeout(r, 0)); // yield
    }
  }

  // =========================
  // 5) Data models
  // =========================
  let defs = null;   // definitions.json
  let state = null;  // state.json

  const ui = {
    tabs: [],
    selectedTab: null,
    detailChallengeId: null,
    detailScrollY: 0,
    isDragging: false,
    dragLast: null,
    overview: {
      scrollX: 0, scrollY: 0,
      centered: false,
      minX: 999999, minY: 999999, maxX: -999999, maxY: -999999,
      fade: 0,
      holding: null,
    }
  };

  // =========================
  // 6) Helpers: formatting & progress
  // =========================
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fmtCategoryTitle(cat) {
    switch (cat) {
      case "ARCHAEOLOGY": return "Archaeology Category";
      case "INTERACTION": return "Interaction Category";
      case "GENERATED_LOOT": return "Generated Structure Loot Category";
      case "MONSTER": return "Monster Hunt Category";
      case "FISHING": return "Fishing Category";
      case "GIFTS": return "Gift Category";
      case "PIGLIN_BARTERING": return "Piglin Bartering Category";
      default: return cat;
    }
  }

  // 1:1 Port deiner Java-Switch-Liste
  const LOOT_TABLE_LABELS = Object.freeze({
    "minecraft:archaeology/desert_well": "Desert Well",
    "minecraft:archaeology/desert_pyramid": "Desert Pyramid",
    "minecraft:archaeology/trail_ruins_common": "Trail Ruins Common",
    "minecraft:archaeology/trail_ruins_rare": "Trail Ruins Rare",
    "minecraft:archaeology/ocean_ruin_cold": "Cold Ocean Ruin",
    "minecraft:archaeology/ocean_ruin_warm": "Warm Ocean Ruin",
    "minecraft:brush/armadillo": "Armadillo Brushing",
    "minecraft:carve/pumpkin": "Pumpkin Carving",
    "minecraft:shearing/mooshroom": "Mooshroom Shearing",
    "minecraft:shearing/sheep": "Sheep Shearing",
    "minecraft:shearing/bogged": "Bogged Shearing",
    "minecraft:shearing/snow_golem": "Snow Golem Shearing",
    "minecraft:charged_creeper/root": "Charged Creeper Explosion",
    "minecraft:chests/trial_chambers/corridor": "Corridor Chest",
    "minecraft:chests/trial_chambers/entrance": "Entrance Chest",
    "minecraft:chests/trial_chambers/intersection": "Intersection Chest",
    "minecraft:chests/trial_chambers/intersection_barrel": "Intersection Barrel",
    "minecraft:chests/trial_chambers/reward": "Vault Reward",
    "minecraft:chests/trial_chambers/reward_ominous": "Ominous Vault Reward",
    "minecraft:chests/trial_chambers/supply": "Supply Chest",
    "minecraft:dispensers/trial_chambers/chamber": "Chamber Dispenser",
    "minecraft:dispensers/trial_chambers/corridor": "Corridor Dispenser",
    "minecraft:dispensers/trial_chambers/water": "Water Dispenser",
    "minecraft:pots/trial_chambers/corridor": "Corridor Pots",
    "minecraft:spawners/trial_chamber/key": "Trial Spawner Reward",
    "minecraft:spawners/trial_chamber/consumables": "Trial Spawner Reward",
    "minecraft:spawners/ominous/trial_chamber/key": "Ominous Trial Spawner Reward",
    "minecraft:spawners/ominous/trial_chamber/consumables": "Ominous Trial Spawner Reward",

    "minecraft:chests/village/village_armorer": "Armorer Chest",
    "minecraft:chests/village/village_butcher": "Butcher Chest",
    "minecraft:chests/village/village_cartographer": "Cartographer Chest",
    "minecraft:chests/village/village_fisher": "Fisher Chest",
    "minecraft:chests/village/village_fletcher": "Fletcher Chest",
    "minecraft:chests/village/village_mason": "Mason Chest",
    "minecraft:chests/village/village_shepherd": "Shepherd Chest",
    "minecraft:chests/village/village_tannery": "Leatherworker Chest",
    "minecraft:chests/village/village_temple": "Cleric Chest",
    "minecraft:chests/village/village_toolsmith": "Toolsmith Chest",
    "minecraft:chests/village/village_weaponsmith": "Weapon Smith Chest",
    "minecraft:chests/village/village_desert_house": "Desert Housing Chest",
    "minecraft:chests/village/village_plains_house": "Plains Housing Chest",
    "minecraft:chests/village/village_savanna_house": "Savanna Housing Chest",
    "minecraft:chests/village/village_snowy_house": "Snowy Housing Chest",
    "minecraft:chests/village/village_taiga_house": "Taiga Housing Chest",

    "minecraft:chests/abandoned_mineshaft": "Mineshaft Chest Minecart",
    "minecraft:chests/ancient_city": "Ancient City Chests",
    "minecraft:chests/ancient_city_ice_box": "Ancient City Icebox Chest",
    "minecraft:chests/bastion_bridge": "Bridge Bastion Chests",
    "minecraft:chests/bastion_other": "Housing Bastion Chests",
    "minecraft:chests/bastion_hoglin_stable": "Hoglin Stable Bastion Chests",
    "minecraft:chests/bastion_treasure": "Treasure Bastion Chests",
    "minecraft:chests/buried_treasure": "Buried Treasure Chest",
    "minecraft:chests/desert_pyramid": "Desert Pyramid Chests",
    "minecraft:chests/end_city_treasure": "End City Chests",
    "minecraft:chests/igloo_chest": "Igloo Basement Chest",
    "minecraft:chests/jungle_temple": "Jungle Temple Chests",
    "minecraft:chests/jungle_temple_dispenser": "Jungle Temple Dispenser",
    "minecraft:chests/nether_bridge": "Nether Fortress Chest",
    "minecraft:chests/pillager_outpost": "Pillager Outpost Chest",
    "minecraft:chests/ruined_portal": "Ruined Portal Chest",
    "minecraft:chests/shipwreck_supply": "Shipwreck Supply Chest",
    "minecraft:chests/shipwreck_treasure": "Shipwreck Treasure Chest",
    "minecraft:chests/shipwreck_map": "Shipwreck Map Chest",
    "minecraft:chests/simple_dungeon": "Spawner Chest",
    "minecraft:chests/stronghold_corridor": "Stronghold Altar Chests",
    "minecraft:chests/stronghold_crossing": "Stronghold Supply Chest",
    "minecraft:chests/stronghold_library": "Stronghold Library Chests",
    "minecraft:chests/underwater_ruin_big": "Large Ocean Ruin Chest",
    "minecraft:chests/underwater_ruin_small": "Small Ocean Ruin Chest",
    "minecraft:chests/woodland_mansion": "Woodland Mansion Chests",

    "minecraft:entities/zombie": "Zombie",
    "minecraft:entities/husk": "Husk",
    "minecraft:entities/zombie_villager": "Zombie Villager",
    "minecraft:entities/drowned": "Drowned",
    "minecraft:entities/skeleton": "Skeleton",
    "minecraft:entities/stray": "Stray",
    "minecraft:entities/bogged": "Bogged",
    "minecraft:entities/wither_skeleton": "Wither Skeleton",
    "minecraft:entities/blaze": "Blaze",
    "minecraft:entities/breeze": "Breeze",
    "minecraft:entities/cave_spider": "Cave Spider",
    "minecraft:entities/spider": "Spider",
    "minecraft:entities/chicken": "Chicken",
    "minecraft:entities/cod": "Cod",
    "minecraft:entities/copper_golem": "Copper Golem",
    "minecraft:entities/cow": "Cow",
    "minecraft:entities/creeper": "Creeper",
    "minecraft:entities/dolphin": "Dolphin",
    "minecraft:entities/donkey": "Donkey",
    "minecraft:entities/elder_guardian": "Elder Guardian",
    "minecraft:entities/enderman": "Enderman",
    "minecraft:entities/evoker": "Evoker",
    "minecraft:entities/ghast": "Ghast",
    "minecraft:entities/glow_squid": "Glow Squid",
    "minecraft:entities/guardian": "Guardian",
    "minecraft:entities/hoglin": "Hoglin",
    "minecraft:entities/horse": "Horse",
    "minecraft:entities/iron_golem": "Iron Golem",
    "minecraft:entities/llama": "Llama",
    "minecraft:entities/magma_cube": "Magma Cube",
    "minecraft:entities/mooshroom": "Mooshroom",
    "minecraft:entities/mule": "Mule",
    "minecraft:entities/panda": "Panda",
    "minecraft:entities/parrot": "Parrot",
    "minecraft:entities/phantom": "Phantom",
    "minecraft:entities/pig": "Pig",
    "minecraft:entities/pillager": "Pillager",
    "minecraft:entities/polar_bear": "Polar Bear",
    "minecraft:entities/pufferfish": "Pufferfish",
    "minecraft:entities/rabbit": "Rabbit",
    "minecraft:entities/ravager": "Ravager",
    "minecraft:entities/salmon": "Salmon",
    "minecraft:entities/sheep": "Sheep",
    "minecraft:entities/shulker": "Shulker",
    "minecraft:entities/skeleton_horse": "Skeleton Horse",
    "minecraft:entities/slime": "Slime",
    "minecraft:entities/snow_golem": "Snow Golem",
    "minecraft:entities/squid": "Squid",
    "minecraft:entities/strider": "Strider",
    "minecraft:entities/trader_llama": "Trader Llama",
    "minecraft:entities/tropical_fish": "Tropical Fish",
    "minecraft:entities/turtle": "Turtle",
    "minecraft:entities/vindicator": "Vindicator",
    "minecraft:entities/warden": "Warden",
    "minecraft:entities/witch": "Witch",
    "minecraft:entities/wither": "Wither",
    "minecraft:entities/zoglin": "Zoglin",
    "minecraft:entities/zombified_piglin": "Zombified Piglin",

    "minecraft:gameplay/fishing/fish": "Fish Category",
    "minecraft:gameplay/fishing/treasure": "Treasure Category",
    "minecraft:gameplay/fishing/junk": "Junk Category",

    "minecraft:gameplay/hero_of_the_village/baby_gift": "Baby Gift",
    "minecraft:gameplay/hero_of_the_village/armorer_gift": "Armorer Gift",
    "minecraft:gameplay/hero_of_the_village/butcher_gift": "Butcher Gift",
    "minecraft:gameplay/hero_of_the_village/cartographer_gift": "Cartographer Gift",
    "minecraft:gameplay/hero_of_the_village/cleric_gift": "Cleric Gift",
    "minecraft:gameplay/hero_of_the_village/farmer_gift": "Farmer Gift",
    "minecraft:gameplay/hero_of_the_village/fisherman_gift": "Fisherman Gift",
    "minecraft:gameplay/hero_of_the_village/fletcher_gift": "Fletcher Gift",
    "minecraft:gameplay/hero_of_the_village/leatherworker_gift": "Leatherworker Gift",
    "minecraft:gameplay/hero_of_the_village/librarian_gift": "Librarian Gift",
    "minecraft:gameplay/hero_of_the_village/mason_gift": "Mason Gift",
    "minecraft:gameplay/hero_of_the_village/shepherd_gift": "Shepherd Gift",
    "minecraft:gameplay/hero_of_the_village/toolsmith_gift": "Toolsmith Gift",
    "minecraft:gameplay/hero_of_the_village/weaponsmith_gift": "Weaponsmith Gift",
    "minecraft:gameplay/hero_of_the_village/unemployed_gift": "Unemployed Gift",

    "minecraft:gameplay/armadillo_shed": "Armadillo Shed",
    "minecraft:gameplay/cat_morning_gift": "Cat Morning Gift",
    "minecraft:gameplay/chicken_lay": "Chicken Lay",
    "minecraft:gameplay/panda_sneeze": "Panda Sneeze",
    "minecraft:gameplay/sniffer_digging": "Sniffer Digging",
    "minecraft:gameplay/turtle_grow": "Turtle Grow",
    "minecraft:gameplay/piglin_bartering": "Piglin Bartering",
  });

  function fmtLootTable(path) {
    return LOOT_TABLE_LABELS[path] ?? path;
  }

  function getChallengeById(id) {
    return defs?.challenges?.find(c => c.id === id) || null;
  }

  function isChallengeCompleted(id) {
    return (state?.completed || []).includes(id);
  }

  function getAttemptsFor(id) {
    const c = (state?.counters || []).find(x => x.challengeId === id);
    return c ? c.attempts : 0;
  }

  function getActiveId() {
    return state?.activeId || null;
  }

  function getCollectedFor(challengeId, itemKeyStr) {
    const p = state?.progress?.[challengeId];
    return p ? (p[itemKeyStr] ?? 0) : 0;
  }

  function completionRatio(ch) {
    let total = 0, done = 0;
    for (const it of ch.items) {
      total += it.required;
      const have = getCollectedFor(ch.id, it.key);
      done += Math.min(have, it.required);
    }
    return total <= 0 ? 0 : (done / total);
  }

  function getFrameKey(ch) {
    const active = (getActiveId() === ch.id);
    const completed = isChallengeCompleted(ch.id);
    if (completed) return "frame_challenge_obtained";
    if (active) return "frame_task_obtained";
    return "frame_task_unobtained";
  }

  // =========================
  // 7) Tabs: assign types like Java
  // =========================
  function buildTabsFromDefinitions() {
    const cats = defs.categories || [];
    const tabs = [];
    let flat = 0;

    for (const cat of cats) {
      const challenges = defs.challenges.filter(c => c.category === cat);
      if (!challenges.length) continue;

      let idx = flat;
      let chosen = null;
      for (const t of TAB_TYPES) {
        if (idx < t.max) { chosen = { type: t, index: idx }; break; }
        idx -= t.max;
      }
      if (!chosen) continue;

      tabs.push({
        category: cat,
        title: fmtCategoryTitle(cat),
        type: chosen.type,
        index: chosen.index,
        challenges
      });

      if (!ui.selectedTab) ui.selectedTab = tabs[tabs.length - 1];
      flat++;
    }

    ui.tabs = tabs;
    ui.overview.centered = false;
    ui.overview.scrollX = 0;
    ui.overview.scrollY = 0;
  }

  // =========================
  // 8) Rendering primitives
  // =========================
  function drawTiledBackground(img, x0, y0, w, h, offsetX, offsetY) {
    if (!img) return;
    const tile = 16;
    const ox = ((offsetX % tile) + tile) % tile;
    const oy = ((offsetY % tile) + tile) % tile;

    for (let y = -1; y <= Math.ceil(h / tile) + 1; y++) {
      for (let x = -1; x <= Math.ceil(w / tile) + 1; x++) {
        ctx.drawImage(img, x0 + ox + x * tile, y0 + oy + y * tile, tile, tile);
      }
    }
  }

  function scissor(x, y, w, h, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    fn();
    ctx.restore();
  }

  // Sprite blit: crop top-left if bigger, else scale
  function blitSprite(img, dx, dy, w, h) {
    if (!img) return;
    if (img.width >= w && img.height >= h) {
      ctx.drawImage(img, 0, 0, w, h, dx, dy, w, h);
    } else {
      ctx.drawImage(img, dx, dy, w, h);
    }
  }

  // =========================
  // 9) Lazy icon selection helpers
  // =========================
  function getChallengeIconUrlsForTab(tab) {
    if (!tab) return [];
    const out = [];
    for (const ch of tab.challenges) if (ch.iconUrl) out.push(ch.iconUrl);
    return out;
  }

  function getItemIconUrlsForDetail(challengeId) {
    const ch = getChallengeById(challengeId);
    if (!ch) return [];
    const out = [];
    for (const it of ch.items) if (it.iconUrl) out.push(it.iconUrl);
    return out;
  }

  // Optional: NUR sichtbare Widgets nachladen (max. Performance bei riesigen Tabs)
  function getVisibleChallengeIconUrls() {
    if (!ui.selectedTab) return [];
    const k = Math.floor(ui.overview.scrollX);
    const l = Math.floor(ui.overview.scrollY);

    const out = [];
    const chs = ui.selectedTab.challenges;
    for (let i = 0; i < chs.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = k + col * WIDGET_STEP_X;
      const y = l + row * WIDGET_STEP_Y;

      // widget bounding box (26x26)
      const x2 = x + WIDGET_W;
      const y2 = y + WIDGET_W;

      // inside visible?
      if (x2 < -32 || y2 < -32 || x > INSIDE_W + 32 || y > INSIDE_H + 32) continue;

      const url = chs[i].iconUrl;
      if (url) out.push(url);
    }
    return out;
  }

  // =========================
  // 10) Overview geometry
  // =========================
  function computeWidgetBounds(challenges) {
    ui.overview.minX = 999999; ui.overview.minY = 999999;
    ui.overview.maxX = -999999; ui.overview.maxY = -999999;

    challenges.forEach((ch, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * WIDGET_STEP_X;
      const y = row * WIDGET_STEP_Y;
      ui.overview.minX = Math.min(ui.overview.minX, x);
      ui.overview.minY = Math.min(ui.overview.minY, y);
      ui.overview.maxX = Math.max(ui.overview.maxX, x + 28);
      ui.overview.maxY = Math.max(ui.overview.maxY, y + 27);
    });
  }

  function ensureOverviewCentered() {
    if (ui.overview.centered) return;
    const chs = ui.selectedTab?.challenges || [];
    computeWidgetBounds(chs);

    ui.overview.scrollX = 117 - ((ui.overview.maxX + ui.overview.minX) / 2);
    ui.overview.scrollY = 56  - ((ui.overview.maxY + ui.overview.minY) / 2);
    ui.overview.centered = true;
  }

  // =========================
  // 12) Overview draw
  // =========================
  function drawOverviewInside() {
    if (!ui.selectedTab) return;
    ensureOverviewCentered();

    const bg = imgs.get("bgDefault");
    const k = Math.floor(ui.overview.scrollX);
    const l = Math.floor(ui.overview.scrollY);

    drawTiledBackground(bg, 0, 0, INSIDE_W, INSIDE_H, k, l);

    const challenges = ui.selectedTab.challenges;
    const now = performance.now();

    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * WIDGET_STEP_X;
      const y = row * WIDGET_STEP_Y;

      const frameKey = getFrameKey(ch);
      const frameImg = imgs.get(frameKey);
      if (frameImg) ctx.drawImage(frameImg, k + x + 3, l + y, 26, 26);

      // icon
      const iconX = k + x + 8;
      const iconY = l + y + 5;

      const iconImg = (ch.iconUrl && imgs.has(ch.iconUrl)) ? imgs.get(ch.iconUrl) : null;
      if (iconImg) {
        ctx.drawImage(iconImg, iconX, iconY, 16, 16);
      } else {
        ctx.fillStyle = "#bbb";
        ctx.font = "10px monospace";
        ctx.fillText("?", iconX + 5, iconY + 2);
      }

      // Holding select overlay
      const completed = isChallengeCompleted(ch.id);
      if (ui.overview.holding?.challengeId === ch.id && !getActiveId() && !completed) {
        const prog = clamp((performance.now() - ui.overview.holding.startMs) / HOLD_MS, 0, 1);
        const filled = Math.floor(16 * prog);
        if (filled > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillRect(iconX, iconY, 16, filled);
        }
        if (prog >= 1) {
          ui.overview.holding = null;
        }
      }
    }

    // LAZY: sichtbare Icons nachladen (super wichtig bei vielen Challenges)
    // -> das ist billig und verhindert, dass beim ersten Tab ALLES geladen wird
    ensureIconsLoaded(getVisibleChallengeIconUrls());
  }

  function hitTestWidget(localX, localY) {
    if (!ui.selectedTab) return null;
    const k = Math.floor(ui.overview.scrollX);
    const l = Math.floor(ui.overview.scrollY);
    const challenges = ui.selectedTab.challenges;

    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = k + col * WIDGET_STEP_X;
      const y = l + row * WIDGET_STEP_Y;

      if (localX >= x && localX <= x + WIDGET_W && localY >= y && localY <= y + WIDGET_W) {
        return { challenge: ch, screenX: x, screenY: y };
      }
    }
    return null;
  }

  // =========================
  // 13) Detail view
  // =========================
  function buildLootPanels(items) {
    const out = [];
    let current = [];
    let currentTable = null;

    for (const it of items) {
      const t = it.lootTableId;
      if (currentTable && currentTable !== t) {
        out.push({ tableId: currentTable, items: current.slice() });
        current = [];
      }
      current.push(it);
      currentTable = t;
    }
    if (currentTable && current.length) out.push({ tableId: currentTable, items: current.slice() });

    return out.map(p => {
      const rows = Math.ceil(p.items.length / PANEL_COLS);
      const innerH = rows * SLOT_SIZE;
      const height = PANEL_HEADER_H + PANEL_PADDING + innerH + PANEL_PADDING;
      return { ...p, rows, height };
    });
  }

  function drawDetailInside() {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) return;

    const bg = imgs.get("bgDefault");
    drawTiledBackground(bg, 0, 0, INSIDE_W, INSIDE_H, 0, 0);

    const panels = buildLootPanels(ch.items);
    let cursorY = 4 + Math.floor(ui.detailScrollY);

    const now = performance.now();

    for (const p of panels) {
      const panelW = PANEL_COLS * SLOT_SIZE + PANEL_PADDING * 2;
      const panelX = Math.floor((INSIDE_W - panelW) / 2);
      const panelY = cursorY;

      ctx.fillStyle = "#000"; ctx.fillRect(panelX, panelY, panelW, p.height);
      ctx.fillStyle = "#404040"; ctx.fillRect(panelX + 1, panelY + 1, panelW - 2, p.height - 2);

      ctx.fillStyle = "#fff";
      ctx.font = "8px monospace";
      ctx.fillText(fmtLootTable(p.tableId), panelX + 5, panelY + 12);

      const slotsOX = panelX + PANEL_PADDING;
      const slotsOY = panelY + PANEL_HEADER_H + PANEL_PADDING;

      for (let i = 0; i < p.items.length; i++) {
        const it = p.items[i];
        const col = i % PANEL_COLS;
        const row = Math.floor(i / PANEL_COLS);
        const sx = slotsOX + col * SLOT_SIZE;
        const sy = slotsOY + row * SLOT_SIZE;

        const slotImg = imgs.get("slot");
        if (slotImg) ctx.drawImage(slotImg, sx, sy, 18, 18);

        const have = isChallengeCompleted(ch.id) ? it.required : getCollectedFor(ch.id, it.key);
        const done = have >= it.required;

        const iconImg = (it.iconUrl && imgs.has(it.iconUrl)) ? imgs.get(it.iconUrl) : null;
        if (iconImg) ctx.drawImage(iconImg, sx + 1, sy + 1, 16, 16);
        else {
          ctx.fillStyle = "#ddd";
          ctx.font = "12px monospace";
          ctx.fillText("?", sx + 7, sy + 3);
        }

        if (done) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx + 1, sy + 1, 16, 16);
          const confirmImg = imgs.get("confirm");
          if (confirmImg) ctx.drawImage(confirmImg, sx + 1, sy - 1, 18, 18);
        }
      }

      cursorY += p.height + PANEL_SPACING;
    }

    // LAZY: Item icons nachladen (wenn Detail offen)
    ensureIconsLoaded(getItemIconUrlsForDetail(ui.detailChallengeId));
  }

  function scrollDetail(dy) {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) { ui.detailScrollY = 0; return; }
    const panels = buildLootPanels(ch.items);

    let contentH = 0;
    for (let i = 0; i < panels.length; i++) {
      contentH += panels[i].height;
      if (i < panels.length - 1) contentH += PANEL_SPACING;
    }
    if (contentH <= INSIDE_H) { ui.detailScrollY = 0; return; }

    ui.detailScrollY = clamp(ui.detailScrollY + dy, -(contentH - INSIDE_H), 0);
  }

  function hitTestDetailSlot(mouseX, mouseY) {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) return null;

    const panels = buildLootPanels(ch.items);
    let cursorY = 4 + Math.floor(ui.detailScrollY);

    for (const p of panels) {
      const panelW = PANEL_COLS * SLOT_SIZE + PANEL_PADDING * 2;
      const panelX = Math.floor((INSIDE_W - panelW) / 2);
      const panelY = cursorY;

      const slotsOX = panelX + PANEL_PADDING;
      const slotsOY = panelY + PANEL_HEADER_H + PANEL_PADDING;

      for (let i = 0; i < p.items.length; i++) {
        const it = p.items[i];
        const col = i % PANEL_COLS;
        const row = Math.floor(i / PANEL_COLS);
        const sx = slotsOX + col * SLOT_SIZE;
        const sy = slotsOY + row * SLOT_SIZE;

        if (mouseX >= sx && mouseX < sx + 16 && mouseY >= sy && mouseY < sy + 16) {
          return { item: it, tableId: p.tableId, sx, sy, challenge: ch };
        }
      }

      cursorY += p.height + PANEL_SPACING;
    }
    return null;
  }

  // =========================
  // 14) Tooltips (GLOBAL, nicht geclippt)
  // =========================
  function drawOverviewTooltipGlobal(mouseLocalX, mouseLocalY) {
    const hit = hitTestWidget(mouseLocalX, mouseLocalY);
    const hovered = !!hit;

    if (hovered) ui.overview.fade = clamp(ui.overview.fade + 0.02, 0, 0.30);
    else ui.overview.fade = clamp(ui.overview.fade - 0.04, 0, 1);

    if (ui.overview.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${ui.overview.fade})`;
      ctx.fillRect(ORGX + INSIDE_X, ORGY + INSIDE_Y, INSIDE_W, INSIDE_H);
    }

    if (!hit) return;

    const ch = hit.challenge;

    let total = 0, done = 0;
    for (const it of ch.items) {
      total += it.required;
      const have = getCollectedFor(ch.id, it.key);
      done += Math.min(have, it.required);
    }

    const completed = isChallengeCompleted(ch.id);
    let progressText = null;
    if (completed) progressText = `completed (Attempts: ${getAttemptsFor(ch.id)})`;
    else if (total > 0) progressText = `Items found: ${done}/${total} (${Math.round((done/total)*100)}%)`;

    const lines = [ch.title];
    if (progressText) lines.push(progressText);

    ctx.font = "6px monospace";
    const padX = 6, padY = 5, lineH = 4;

    let textW = 0;
    for (const line of lines) textW = Math.max(textW, ctx.measureText(line).width);

    let w = Math.ceil(textW + padX * 2);
    let h = Math.ceil(padY * 2 + lines.length * (lineH + 2));

    let bx = (ORGX + INSIDE_X) + hit.screenX + 32;
    let by = (ORGY + INSIDE_Y) + hit.screenY + 4;

    bx = clamp(bx, 2, CANVAS_W - w - 2);
    by = clamp(by, 2, CANVAS_H - h - 2);

    ctx.fillStyle = "rgba(16,16,16,0.92)";
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);

    ctx.fillStyle = "#fff";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padX, by + padY + i * (lineH + 2) + 5);
    }
  }

  function drawDetailTooltipGlobal(mouseX, mouseY) {
    const hit = hitTestDetailSlot(mouseX, mouseY);
    if (!hit) return;

    const it = hit.item;
    const ch = hit.challenge;

    const have = isChallengeCompleted(ch.id) ? it.required : getCollectedFor(ch.id, it.key);
    const clamped = Math.min(have, it.required);
    const pct = it.required > 0 ? Math.round((clamped / it.required) * 100) : 0;

    const lines = [
      it.displayName || it.key,
      `Benötigt: ${it.required}`,
      `Fortschritt: ${clamped} / ${it.required} (${pct}%)`,
      `Chance: ${it.chance}%`,
      `LootTable: ${hit.tableId}`
    ];

    ctx.font = "6px monospace";
    const padX = 6, padY = 5, lineH = 4;

    let textW = 0;
    for (const line of lines) textW = Math.max(textW, ctx.measureText(line).width);

    let w = Math.ceil(textW + padX * 2);
    let h = Math.ceil(padY * 2 + lines.length * (lineH + 2));

    let bx = (ORGX + INSIDE_X) + mouseX + 10;
    let by = (ORGY + INSIDE_Y) + mouseY + 10;

    bx = clamp(bx, 2, CANVAS_W - w - 2);
    by = clamp(by, 2, CANVAS_H - h - 2);

    ctx.fillStyle = "rgba(16,16,16,0.92)";
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);

    ctx.fillStyle = "#fff";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padX, by + padY + i * (lineH + 2) + 5);
    }
  }

  function drawTooltipsGlobal() {
    const local = getMouseLocal();
    if (ui.detailChallengeId) drawDetailTooltipGlobal(local.x, local.y);
    else drawOverviewTooltipGlobal(local.x, local.y);
  }

  // =========================
  // 15) Window + tabs + back
  // =========================
  function isOverBackButton(x, y) {
    return ui.detailChallengeId &&
      x >= ORGX + 9 && x <= ORGX + 9 + 23 &&
      y >= ORGY + 19 && y <= ORGY + 19 + 13;
  }

  function hitTestTab(mx, my) {
    for (const t of ui.tabs) {
      const x = ORGX + t.type.getX(t.index);
      const y = ORGY + t.type.getY(t.index);
      if (mx > x && mx < x + t.type.width && my > y && my < y + t.type.height) return t;
    }
    return null;
  }

  function drawWindow() {
    const win = imgs.get("window");
    if (win) ctx.drawImage(win, 0, 0, WINDOW_W, WINDOW_H, ORGX, ORGY, WINDOW_W, WINDOW_H);

    // tabs
    if (ui.tabs.length > 1) {
      for (const t of ui.tabs) {
        const type = t.type;
        const selected = (t === ui.selectedTab);
        const set = selected ? type.sprites.selected : type.sprites.unselected;

        const spriteKey =
          (t.index === 0) ? set.first :
          (t.index === type.max - 1) ? set.last :
          set.middle;

        const img = imgs.get(spriteKey);
        const x = ORGX + type.getX(t.index);
        const y = ORGY + type.getY(t.index);

        // Pixel-perfect: crop top-left to expected w/h
        blitSprite(img, x, y, type.width, type.height);
      }

      // category icons (16x16)
      for (const t of ui.tabs) {
        const type = t.type;
        const iconKey = CATEGORY_ICON_KEY[t.category];
        const iconImg = iconKey ? imgs.get(iconKey) : null;

        const x = ORGX + type.getX(t.index) + type.iconOffset.x;
        const y = ORGY + type.getY(t.index) + type.iconOffset.y;

        if (iconImg) ctx.drawImage(iconImg, x, y, 16, 16);
      }
    }

    // title
    ctx.fillStyle = "#3f3f3f";
    ctx.font = "10px monospace";
    const title = ui.detailChallengeId
      ? "Challenge Details"
      : (ui.selectedTab?.title || "ALL & ONLY: LootTables");
    ctx.fillText(title, ORGX + TITLE_X, ORGY + TITLE_Y + 7);

    // back button
    if (ui.detailChallengeId) {
      const bx = ORGX + 9, by = ORGY + 19;
      const hovered = isOverBackButton(lastMouse.x, lastMouse.y);
      const img = hovered ? imgs.get("back_hover") : imgs.get("back_normal");
      if (img) blitSprite(img, bx, by, 23, 13);
    }
  }

  // =========================
  // 16) Main render loop
  // =========================
  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    scissor(ORGX + INSIDE_X, ORGY + INSIDE_Y, INSIDE_W, INSIDE_H, () => {
      ctx.save();
      ctx.translate(ORGX + INSIDE_X, ORGY + INSIDE_Y);

      if (ui.detailChallengeId) drawDetailInside();
      else drawOverviewInside();

      ctx.restore();
    });

    drawWindow();
    drawTooltipsGlobal();

    drawLoadingOverlay();

    requestAnimationFrame(render);
  }

  // =========================
  // 17) Mouse mapping
  // =========================
  let lastMouse = { x: 0, y: 0 };

  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;

    lastMouse.x = (e.clientX - rect.left) * sx;
    lastMouse.y = (e.clientY - rect.top) * sy;
  }

  function getMouseLocal() {
    return { x: lastMouse.x - (ORGX + INSIDE_X), y: lastMouse.y - (ORGY + INSIDE_Y) };
  }

  // =========================
  // 18) Input
  // =========================
  canvas.addEventListener("mousemove", (e) => {
    updateMouse(e);

    if (ui.overview.holding && !ui.detailChallengeId) {
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (!hit || hit.challenge.id !== ui.overview.holding.challengeId) {
        ui.overview.holding = null;
      }
    }

    if (!ui.isDragging) return;
    const dx = lastMouse.x - ui.dragLast.x;
    const dy = lastMouse.y - ui.dragLast.y;
    ui.dragLast = { x: lastMouse.x, y: lastMouse.y };

    if (ui.detailChallengeId) {
      scrollDetail(dy);
    } else {
      const w = ui.overview.maxX - ui.overview.minX;
      const h = ui.overview.maxY - ui.overview.minY;
      if (w > INSIDE_W) ui.overview.scrollX = clamp(ui.overview.scrollX + dx, -(w - INSIDE_W), 0);
      if (h > INSIDE_H) ui.overview.scrollY = clamp(ui.overview.scrollY + dy, -(h - INSIDE_H), 0);
    }
  });

  canvas.addEventListener("mousedown", (e) => {
    updateMouse(e);

    // Tab click
    if (e.button === 0) {
      const t = hitTestTab(lastMouse.x, lastMouse.y);
      if (t) {
        ui.selectedTab = t;
        ui.detailChallengeId = null;
        ui.overview.centered = false;
        ui.overview.fade = 0;

        // LAZY: preload icons for tab (optional, klein) – oder nur sichtbare via render()
        ensureIconsLoaded(getChallengeIconUrlsForTab(ui.selectedTab));

        return;
      }
    }

    // Back button
    if (e.button === 0 && isOverBackButton(lastMouse.x, lastMouse.y)) {
      ui.detailChallengeId = null;
      ui.detailScrollY = 0;
      return;
    }

    const inside = (
      lastMouse.x >= ORGX + INSIDE_X && lastMouse.x <= ORGX + INSIDE_X + INSIDE_W &&
      lastMouse.y >= ORGY + INSIDE_Y && lastMouse.y <= ORGY + INSIDE_Y + INSIDE_H
    );
    if (!inside) return;

    // Open detail
    if (!ui.detailChallengeId && e.button === 0) {
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (hit) {
        ui.detailChallengeId = hit.challenge.id;
        ui.detailScrollY = 0;

        // LAZY: item icons
        ensureIconsLoaded(getItemIconUrlsForDetail(ui.detailChallengeId));

        return;
      }
    }

    // Start drag
    if (e.button === 0) {
      ui.isDragging = true;
      ui.dragLast = { x: lastMouse.x, y: lastMouse.y };
    }

    // Right click hold (optional)
    if (!ui.detailChallengeId && e.button === 2) {
      e.preventDefault();
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (hit && !getActiveId() && !isChallengeCompleted(hit.challenge.id)) {
        ui.overview.holding = { challengeId: hit.challenge.id, startMs: performance.now() };
      }
    }
  });

  canvas.addEventListener("mouseup", () => {
    ui.isDragging = false;
    ui.dragLast = null;
    ui.overview.holding = null;
  });

  canvas.addEventListener("wheel", (e) => {
    updateMouse(e);

    if (ui.detailChallengeId) {
      scrollDetail(-e.deltaY * 0.5);
    } else {
      const w = ui.overview.maxX - ui.overview.minX;
      const h = ui.overview.maxY - ui.overview.minY;
      if (w > INSIDE_W) ui.overview.scrollX = clamp(ui.overview.scrollX + (-e.deltaX) * 0.5, -(w - INSIDE_W), 0);
      if (h > INSIDE_H) ui.overview.scrollY = clamp(ui.overview.scrollY + (-e.deltaY) * 0.5, -(h - INSIDE_H), 0);
    }

    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // =========================
  // 19) Boot (Data -> Tabs -> Core -> Render -> Lazy)
  // =========================
  async function boot() {
    // Render loop sofort starten, auch wenn noch nix geladen ist:
    if (!loading._renderStarted) {
      loading._renderStarted = true;
      render();
    }

    loading.message = "Loading data...";
    try {
      defs = await (await fetch("./data/definitions.json", { cache: "no-store" })).json();
      loading.dataDone++;
      loading.message = "Loading data... (definitions)";
    } catch (e) {
      console.error("definitions.json failed", e);
      loading.dataDone++;
    }

    try {
      state = await (await fetch("https://script.google.com/macros/s/AKfycbzbD_L7IyuU1OJ-CgM0vDgYhafrex0P3DR56Sa-GQNb63a7Wcz4o4QQPlDaJ0NkFjWJoA/exec", { cache: "no-store" })).json();
      loading.dataDone++;
      loading.message = "Loading data... (state)";
    } catch (e) {
      console.error("state.json failed", e);
      loading.dataDone++;
    }

    // Tabs bauen (geht schon ohne Texturen)
    buildTabsFromDefinitions();

    // Core UI assets laden
    loading.message = "Loading UI textures...";
    await loadCoreAssets();

    // Fertig
    loading.ready = true;
    loading.message = "Done";

    // Lazy: initial tab icons kickstart (nicht blockierend)
    ensureIconsLoaded(getChallengeIconUrlsForTab(ui.selectedTab));
  }

  boot().catch(err => {
    console.error(err);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText("Boot error. Check console.", 10, 10);
  });
})();
