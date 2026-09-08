export interface BodyData {
  id: string
  name: string
  nameEn: string
  color: string
  radius: number
  tagline: string
  description: string
  facts: { label: string; value: string }[]
}

export interface MoonData extends BodyData {
  /** 渲染半径（与 radius 相同，保留独立字段便于阅读） */
  size: number
  /** 绕宿主行星的轨道半径 */
  distance: number
  /** 绕宿主行星一周的场景秒数；负值表示逆行 */
  period: number
}

export interface RingData {
  texture: string
  inner: number
  outer: number
  opacity?: number
}

/** 开普勒轨道要素（角度单位为度），用于椭圆+倾斜轨道的天体 */
export interface OrbitElements {
  /** 半长轴（场景单位） */
  a: number
  /** 离心率，0 为正圆 */
  e: number
  /** 轨道倾角（度） */
  i: number
  /** 升交点经度（度） */
  node: number
  /** 近日点幅角（度） */
  peri: number
}

export interface PlanetData extends BodyData {
  distance: number
  orbitPeriod: number
  rotationPeriod: number
  tilt: number
  texture?: string
  ring?: RingData
  moons?: MoonData[]
  initialAngle: number
  /** 存在时按真实椭圆轨道运行，distance 仅作半长轴参考 */
  orbit?: OrbitElements
}

export const SUN: BodyData = {
  id: 'sun',
  name: '太阳',
  nameEn: 'SUN',
  color: '#ffb340',
  radius: 5.5,
  tagline: '太阳系的心脏与能量之源',
  description:
    '太阳是太阳系的中心恒星，集中了太阳系 99.86% 的质量。核心的氢核聚变每秒将约 6 亿吨氢转化为能量，是地球上一切生命的最终能量来源。',
  facts: [
    { label: '类型', value: 'G2V 黄矮星' },
    { label: '直径', value: '1,392,700 km' },
    { label: '质量占比', value: '太阳系 99.86%' },
    { label: '表面温度', value: '5,505°C' },
    { label: '核心温度', value: '≈1,570 万°C' },
    { label: '年龄', value: '约 46 亿年' },
  ],
}

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    nameEn: 'MERCURY',
    color: '#b8a89a',
    radius: 0.55,
    distance: 13,
    orbitPeriod: 7.2,
    rotationPeriod: 18,
    tilt: 0.03,
    texture: '/textures/mercury.png',
    initialAngle: 0.9,
    tagline: '离太阳最近的行星',
    description:
      '水星是太阳系最小、离太阳最近的行星。它几乎没有大气层，表面布满陨石坑，昼夜温差超过 600°C，是太阳系中的温差之最。',
    facts: [
      { label: '直径', value: '4,879 km' },
      { label: '距太阳', value: '5,791 万 km' },
      { label: '公转周期', value: '88 天' },
      { label: '自转周期', value: '58.6 天' },
      { label: '表面温度', value: '-173 ~ 427°C' },
      { label: '卫星', value: '0 颗' },
    ],
  },
  {
    id: 'venus',
    name: '金星',
    nameEn: 'VENUS',
    color: '#e8c47a',
    radius: 0.92,
    distance: 17,
    orbitPeriod: 18.5,
    rotationPeriod: -30,
    tilt: 177.4,
    texture: '/textures/venus.png',
    initialAngle: 2.6,
    tagline: '夜空中最亮的行星',
    description:
      '金星被浓厚的二氧化碳大气包裹，失控的温室效应让表面温度高达 464°C，比水星还要炎热。它的自转方向与众不同——在金星上，太阳从西边升起。',
    facts: [
      { label: '直径', value: '12,104 km' },
      { label: '距太阳', value: '1.082 亿 km' },
      { label: '公转周期', value: '225 天' },
      { label: '自转周期', value: '243 天 · 逆行' },
      { label: '平均温度', value: '464°C' },
      { label: '卫星', value: '0 颗' },
    ],
  },
  {
    id: 'earth',
    name: '地球',
    nameEn: 'EARTH',
    color: '#4d8fd1',
    radius: 1,
    distance: 22,
    orbitPeriod: 30,
    rotationPeriod: 8,
    tilt: 23.4,
    texture: '/textures/earth.png',
    initialAngle: 4.4,
    moons: [
      {
        id: 'moon',
        name: '月球',
        nameEn: 'MOON',
        color: '#c9c9c9',
        radius: 0.27,
        size: 0.27,
        distance: 2.1,
        period: 2.3,
        tagline: '地球唯一的天然卫星',
        description:
          '月球被地球潮汐锁定，永远以同一面朝向地球。它的引力驱动着地球上的潮起潮落，也让地球的自转轴保持稳定，是地球生命环境的重要守护者。',
        facts: [
          { label: '直径', value: '3,474 km' },
          { label: '距地球', value: '38.4 万 km' },
          { label: '公转周期', value: '27.3 天' },
          { label: '表面温度', value: '-173 ~ 127°C' },
          { label: '所属行星', value: '地球' },
        ],
      },
    ],
    tagline: '目前已知唯一存在生命的星球',
    description:
      '地球是目前已知唯一存在生命的行星。液态水覆盖了约 71% 的表面，适宜的大气层与磁场共同守护着这颗蓝色星球上的万物。',
    facts: [
      { label: '直径', value: '12,756 km' },
      { label: '距太阳', value: '1.496 亿 km' },
      { label: '公转周期', value: '365.25 天' },
      { label: '自转周期', value: '23.9 小时' },
      { label: '平均温度', value: '15°C' },
      { label: '卫星', value: '1 颗' },
    ],
  },
  {
    id: 'mars',
    name: '火星',
    nameEn: 'MARS',
    color: '#c16538',
    radius: 0.72,
    distance: 27.5,
    orbitPeriod: 56.4,
    rotationPeriod: 8.5,
    tilt: 25.2,
    texture: '/textures/mars.png',
    initialAngle: 1.7,
    moons: [
      {
        id: 'phobos',
        name: '火卫一',
        nameEn: 'PHOBOS',
        color: '#9c8b7d',
        radius: 0.09,
        size: 0.09,
        distance: 1.3,
        period: 1.0,
        tagline: '离宿主行星最近的卫星',
        description:
          '火卫一是太阳系中离宿主行星最近的卫星，轨道低到每天能绕火星转近三圈。它正被火星引力缓慢拉低，数千万年后可能解体成一圈碎屑环。',
        facts: [
          { label: '直径', value: '约 22 km' },
          { label: '距火星', value: '9,376 km' },
          { label: '公转周期', value: '7.7 小时' },
          { label: '形状', value: '不规则' },
          { label: '所属行星', value: '火星' },
        ],
      },
      {
        id: 'deimos',
        name: '火卫二',
        nameEn: 'DEIMOS',
        color: '#b0a191',
        radius: 0.07,
        size: 0.07,
        distance: 1.7,
        period: 1.6,
        tagline: '太阳系最小的卫星之一',
        description:
          '火卫二直径仅约 12 公里，表面覆盖着厚厚的尘埃层。它与火卫一形状都不规则，很可能是被火星引力俘获的小行星。',
        facts: [
          { label: '直径', value: '约 12 km' },
          { label: '距火星', value: '2.3 万 km' },
          { label: '公转周期', value: '30.3 小时' },
          { label: '形状', value: '不规则' },
          { label: '所属行星', value: '火星' },
        ],
      },
    ],
    tagline: '红色的沙漠世界',
    description:
      '火星因表面的氧化铁而呈现红色，拥有太阳系最高的火山——奥林帕斯山。它是人类探测器造访最多的行星，也是未来载人深空探测的首选目标。',
    facts: [
      { label: '直径', value: '6,792 km' },
      { label: '距太阳', value: '2.279 亿 km' },
      { label: '公转周期', value: '687 天' },
      { label: '自转周期', value: '24.6 小时' },
      { label: '平均温度', value: '-63°C' },
      { label: '卫星', value: '2 颗' },
    ],
  },
  {
    id: 'jupiter',
    name: '木星',
    nameEn: 'JUPITER',
    color: '#d8b083',
    radius: 2.7,
    distance: 38,
    orbitPeriod: 356,
    rotationPeriod: 3.2,
    tilt: 3.1,
    texture: '/textures/jupiter.png',
    initialAngle: 5.3,
    moons: [
      {
        id: 'io',
        name: '木卫一',
        nameEn: 'IO',
        color: '#d8c98f',
        radius: 0.13,
        size: 0.13,
        distance: 3.6,
        period: 1.2,
        tagline: '太阳系火山活动最剧烈的世界',
        description:
          '木卫一是太阳系火山活动最剧烈的天体，表面遍布硫磺，数百座活火山不断喷发。木星强大的潮汐力反复"揉搓"它的内部，为这些火山提供了源源不断的能量。',
        facts: [
          { label: '直径', value: '3,643 km' },
          { label: '距木星', value: '42.2 万 km' },
          { label: '公转周期', value: '1.8 天' },
          { label: '特点', value: '活火山遍布' },
          { label: '所属行星', value: '木星' },
        ],
      },
      {
        id: 'europa',
        name: '木卫二',
        nameEn: 'EUROPA',
        color: '#c9b8a8',
        radius: 0.11,
        size: 0.11,
        distance: 4.1,
        period: 1.8,
        tagline: '冰壳之下的海洋世界',
        description:
          '木卫二光滑的冰壳上布满纵横交错的裂纹，冰层之下藏着深达百公里的液态海洋，含水量可能超过地球海洋之和，是寻找地外生命最热门的地点之一。',
        facts: [
          { label: '直径', value: '3,122 km' },
          { label: '距木星', value: '67.1 万 km' },
          { label: '公转周期', value: '3.6 天' },
          { label: '特点', value: '冰下液态海洋' },
          { label: '所属行星', value: '木星' },
        ],
      },
      {
        id: 'ganymede',
        name: '木卫三',
        nameEn: 'GANYMEDE',
        color: '#9a918a',
        radius: 0.19,
        size: 0.19,
        distance: 4.7,
        period: 2.6,
        tagline: '太阳系最大的卫星',
        description:
          '木卫三比水星还要大，是太阳系中唯一拥有内禀磁场的卫星。它由岩石与冰构成，内部深处同样可能藏着咸水海洋。',
        facts: [
          { label: '直径', value: '5,268 km' },
          { label: '距木星', value: '107 万 km' },
          { label: '公转周期', value: '7.2 天' },
          { label: '特点', value: '唯一有磁场的卫星' },
          { label: '所属行星', value: '木星' },
        ],
      },
      {
        id: 'callisto',
        name: '木卫四',
        nameEn: 'CALLISTO',
        color: '#7a6f66',
        radius: 0.17,
        size: 0.17,
        distance: 5.4,
        period: 3.6,
        tagline: '伤痕累累的古老世界',
        description:
          '木卫四拥有太阳系中最古老、陨击坑最密集的表面之一。约 40 亿年来它几乎没有地质活动，完整地记录着太阳系早期猛烈的撞击历史。',
        facts: [
          { label: '直径', value: '4,821 km' },
          { label: '距木星', value: '188 万 km' },
          { label: '公转周期', value: '16.7 天' },
          { label: '特点', value: '陨击坑最密集' },
          { label: '所属行星', value: '木星' },
        ],
      },
    ],
    tagline: '行星之王',
    description:
      '木星是太阳系体积与质量最大的行星，足以装下 1,300 个地球。标志性的大红斑是一场已经持续了数百年的巨型风暴。',
    facts: [
      { label: '直径', value: '139,820 km' },
      { label: '距太阳', value: '7.785 亿 km' },
      { label: '公转周期', value: '11.9 年' },
      { label: '自转周期', value: '9.9 小时' },
      { label: '云顶温度', value: '-108°C' },
      { label: '卫星', value: '95 颗' },
    ],
  },
  {
    id: 'saturn',
    name: '土星',
    nameEn: 'SATURN',
    color: '#e3cf9e',
    radius: 2.3,
    distance: 48,
    orbitPeriod: 884,
    rotationPeriod: 3.5,
    tilt: 26.7,
    texture: '/textures/saturn.png',
    initialAngle: 3.1,
    ring: { texture: '/textures/saturn_ring.png', inner: 3.1, outer: 5.3 },
    moons: [
      {
        id: 'titan',
        name: '土卫六',
        nameEn: 'TITAN',
        color: '#d8b06a',
        radius: 0.32,
        size: 0.32,
        distance: 6.4,
        period: 2.8,
        tagline: '唯一拥有浓厚大气的卫星',
        description:
          '土卫六是太阳系唯一拥有浓厚大气的卫星，橙色雾霭之下有液态甲烷构成的湖泊与河流。它以氮为主的大气与早期地球颇为相似，惠更斯号探测器曾成功登陆其表面。',
        facts: [
          { label: '直径', value: '5,150 km' },
          { label: '距土星', value: '122 万 km' },
          { label: '公转周期', value: '15.9 天' },
          { label: '特点', value: '甲烷湖泊与河流' },
          { label: '所属行星', value: '土星' },
        ],
      },
      {
        id: 'rhea',
        name: '土卫五',
        nameEn: 'RHEA',
        color: '#b8b4ae',
        radius: 0.15,
        size: 0.15,
        distance: 7.4,
        period: 3.8,
        tagline: '土星第二大卫星',
        description:
          '土卫五是土星第二大卫星，由冰和岩石构成。它的表面明亮、布满陨击坑，数十亿年来几乎没有地质活动的痕迹。',
        facts: [
          { label: '直径', value: '1,528 km' },
          { label: '距土星', value: '52.7 万 km' },
          { label: '公转周期', value: '4.5 天' },
          { label: '构成', value: '冰与岩石' },
          { label: '所属行星', value: '土星' },
        ],
      },
      {
        id: 'iapetus',
        name: '土卫八',
        nameEn: 'IAPETUS',
        color: '#8f867e',
        radius: 0.16,
        size: 0.16,
        distance: 8.6,
        period: 5.2,
        tagline: '著名的"阴阳脸"',
        description:
          '土卫八以奇异的"阴阳脸"闻名：一个半球亮如白雪，另一个半球暗如沥青。它的赤道上还横亘着一条高耸的山脊，成因至今没有定论。',
        facts: [
          { label: '直径', value: '1,469 km' },
          { label: '距土星', value: '356 万 km' },
          { label: '公转周期', value: '79 天' },
          { label: '特点', value: '明暗两半球反差极大' },
          { label: '所属行星', value: '土星' },
        ],
      },
    ],
    tagline: '光环之冠',
    description:
      '土星以壮观的光环闻名，光环由无数冰粒与岩石碎屑构成，宽逾 20 万公里，厚度却常常不足百米。它的平均密度比水还低。',
    facts: [
      { label: '直径', value: '116,460 km' },
      { label: '距太阳', value: '14.3 亿 km' },
      { label: '公转周期', value: '29.4 年' },
      { label: '自转周期', value: '10.7 小时' },
      { label: '云顶温度', value: '-139°C' },
      { label: '卫星', value: '146 颗' },
    ],
  },
  {
    id: 'uranus',
    name: '天王星',
    nameEn: 'URANUS',
    color: '#9fd8dd',
    radius: 1.6,
    distance: 58,
    orbitPeriod: 2522,
    rotationPeriod: -5.5,
    tilt: 97.8,
    texture: '/textures/uranus.png',
    initialAngle: 0.2,
    ring: { texture: '/textures/uranus_ring.png', inner: 2.4, outer: 3.2, opacity: 0.7 },
    moons: [
      {
        id: 'miranda',
        name: '天卫五',
        nameEn: 'MIRANDA',
        color: '#a8b6bd',
        radius: 0.09,
        size: 0.09,
        distance: 3.7,
        period: 1.8,
        tagline: '地形最怪异的卫星',
        description:
          '天卫五的表面像是被胡乱拼凑起来的：峡谷、悬崖与沟槽交错。其中的维罗纳断崖高达约 20 公里，是太阳系已知最高的悬崖。',
        facts: [
          { label: '直径', value: '472 km' },
          { label: '距天王星', value: '13 万 km' },
          { label: '公转周期', value: '1.4 天' },
          { label: '特点', value: '太阳系最高悬崖' },
          { label: '所属行星', value: '天王星' },
        ],
      },
      {
        id: 'titania',
        name: '天卫三',
        nameEn: 'TITANIA',
        color: '#a5b3bb',
        radius: 0.18,
        size: 0.18,
        distance: 4.2,
        period: 2.4,
        tagline: '天王星最大的卫星',
        description:
          '天卫三是天王星最大的卫星，表面遍布巨大的峡谷系统，说明它的内部曾经活跃。它的名字来自莎士比亚戏剧中的仙后。',
        facts: [
          { label: '直径', value: '1,578 km' },
          { label: '距天王星', value: '43.6 万 km' },
          { label: '公转周期', value: '8.7 天' },
          { label: '名字出处', value: '莎士比亚戏剧' },
          { label: '所属行星', value: '天王星' },
        ],
      },
      {
        id: 'oberon',
        name: '天卫四',
        nameEn: 'OBERON',
        color: '#97a3ac',
        radius: 0.17,
        size: 0.17,
        distance: 4.9,
        period: 3.4,
        tagline: '最外侧的冰质巨人',
        description:
          '天卫四是天王星最外侧的大卫星，表面古老而布满陨击坑，一些陨坑底部覆盖着神秘的暗色物质。它的名字同样来自莎士比亚的戏剧。',
        facts: [
          { label: '直径', value: '1,523 km' },
          { label: '距天王星', value: '58.4 万 km' },
          { label: '公转周期', value: '13.5 天' },
          { label: '名字出处', value: '莎士比亚戏剧' },
          { label: '所属行星', value: '天王星' },
        ],
      },
    ],
    tagline: '躺着自转的冰巨星',
    description:
      '天王星的自转轴倾角接近 98°，几乎"躺"在轨道面上公转，一次极昼或极夜可持续 21 年。大气中的甲烷赋予它淡雅的青绿色。',
    facts: [
      { label: '直径', value: '50,724 km' },
      { label: '距太阳', value: '28.7 亿 km' },
      { label: '公转周期', value: '84 年' },
      { label: '自转周期', value: '17.2 小时 · 逆行' },
      { label: '云顶温度', value: '-197°C' },
      { label: '卫星', value: '28 颗' },
    ],
  },
  {
    id: 'neptune',
    name: '海王星',
    nameEn: 'NEPTUNE',
    color: '#4d6fe0',
    radius: 1.55,
    distance: 67,
    orbitPeriod: 4947,
    rotationPeriod: 5.5,
    tilt: 28.3,
    texture: '/textures/neptune.png',
    initialAngle: 5.9,
    moons: [
      {
        id: 'triton',
        name: '海卫一',
        nameEn: 'TRITON',
        color: '#cfd8dc',
        radius: 0.2,
        size: 0.2,
        distance: 2.9,
        period: -2.2,
        tagline: '逆行的被俘获者',
        description:
          '海卫一沿逆行轨道绕海王星运行，这暗示它很可能是被引力俘获的柯伊伯带天体。它的表面温度低至 -235°C，却有喷出氮冰的间歇泉，是太阳系最寒冷也最活跃的冰世界之一。',
        facts: [
          { label: '直径', value: '2,707 km' },
          { label: '距海王星', value: '35.5 万 km' },
          { label: '公转周期', value: '5.9 天 · 逆行' },
          { label: '表面温度', value: '约 -235°C' },
          { label: '所属行星', value: '海王星' },
        ],
      },
      {
        id: 'proteus',
        name: '海卫八',
        nameEn: 'PROTEUS',
        color: '#9fa8ad',
        radius: 0.1,
        size: 0.1,
        distance: 3.5,
        period: 3.0,
        tagline: '不规则的暗色卫星',
        description:
          '海卫八是海王星第二大卫星，形状不规则，表面黑暗且布满陨击坑。它几乎大到能靠自身引力坍成球形，却最终停在了不规则的形态。',
        facts: [
          { label: '直径', value: '约 420 km' },
          { label: '距海王星', value: '11.8 万 km' },
          { label: '公转周期', value: '1.1 天' },
          { label: '形状', value: '不规则' },
          { label: '所属行星', value: '海王星' },
        ],
      },
    ],
    tagline: '最遥远的蓝色风暴',
    description:
      '海王星是离太阳最远的行星，也是第一颗先由数学计算预测、再被望远镜证实的行星。这里刮着太阳系最强的风，风速可超过 2,000 km/h。',
    facts: [
      { label: '直径', value: '49,244 km' },
      { label: '距太阳', value: '44.95 亿 km' },
      { label: '公转周期', value: '164.8 年' },
      { label: '自转周期', value: '16.1 小时' },
      { label: '云顶温度', value: '-201°C' },
      { label: '卫星', value: '16 颗' },
    ],
  },
  {
    id: 'pluto',
    name: '冥王星',
    nameEn: 'PLUTO',
    color: '#c9b4a0',
    radius: 0.19,
    distance: 85,
    orbitPeriod: 7440,
    rotationPeriod: -51,
    tilt: 119.6,
    initialAngle: 2.4,
    // 真实轨道要素：离心率 0.2488、倾角 17.16°，近日点会切入海王星轨道内侧
    orbit: { a: 85, e: 0.2488, i: 17.16, node: 110.3, peri: 113.76 },
    moons: [
      {
        id: 'charon',
        name: '冥卫一',
        nameEn: 'CHARON',
        color: '#a89a90',
        radius: 0.1,
        size: 0.1,
        distance: 0.9,
        period: 1.5,
        tagline: '与冥王星互为"双星"',
        description:
          '卡戎的直径约为冥王星的一半，是太阳系中相对宿主最大的卫星。它们的共同质心位于冥王星体外，两者互相潮汐锁定、永远以同一面相对，因此常被视作一对双矮行星系统。',
        facts: [
          { label: '直径', value: '1,212 km' },
          { label: '距冥王星', value: '19,596 km' },
          { label: '公转周期', value: '6.4 天' },
          { label: '特点', value: '相互潮汐锁定' },
          { label: '所属行星', value: '冥王星' },
        ],
      },
    ],
    tagline: '曾经的第九大行星',
    description:
      '冥王星 1930 年被发现，曾长期被列为第九大行星，2006 年被国际天文学联合会重新归类为矮行星。2015 年新视野号飞掠时发现其表面有心形的氮冰平原——斯普尼克平原，以及高耸的水冰山脉。',
    facts: [
      { label: '直径', value: '2,377 km' },
      { label: '距太阳', value: '平均约 59 亿 km' },
      { label: '公转周期', value: '248 年' },
      { label: '自转周期', value: '6.4 天 · 逆行' },
      { label: '表面温度', value: '约 -229°C' },
      { label: '分类', value: '矮行星' },
    ],
  },
]

export const ALL_BODIES: BodyData[] = [SUN, ...PLANETS]

export const ALL_MOONS: MoonData[] = PLANETS.flatMap((p) => p.moons ?? [])

const MOON_HOST = new Map<string, string>()
for (const p of PLANETS) {
  for (const m of p.moons ?? []) MOON_HOST.set(m.id, p.id)
}

/** 判断 id 是否为卫星 */
export function isMoonId(id: string): boolean {
  return MOON_HOST.has(id)
}

/** 卫星 id → 宿主行星 id；非卫星返回 null */
export function moonHostId(id: string): string | null {
  return MOON_HOST.get(id) ?? null
}

/** 按 id 查找天体（太阳、行星或卫星） */
export function findBody(id: string | null): BodyData | null {
  if (!id) return null
  return ALL_BODIES.find((b) => b.id === id) ?? ALL_MOONS.find((m) => m.id === id) ?? null
}

export function focusDistance(id: string): number {
  const body = ALL_BODIES.find((b) => b.id === id)
  if (!body) return 10
  return Math.max(body.radius * 6.5 + 1.5, 5)
}
