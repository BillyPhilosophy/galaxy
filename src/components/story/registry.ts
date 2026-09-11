import type { ComponentType } from 'react'
import type { StoryChapter } from '../../data/story'
import NebulaChapter from './nebula/NebulaChapter'
import ProtostarChapter from './protostar/ProtostarChapter'
import MainSequenceChapter from './main-sequence/MainSequenceChapter'
import RedGiantChapter from './red-giant/RedGiantChapter'
import WhiteDwarfChapter from './white-dwarf/WhiteDwarfChapter'
import NeutronStarChapter from './neutron-star/NeutronStarChapter'
import BlackHoleChapter from './black-hole/BlackHoleChapter'
import GalaxyChapter from './galaxy/GalaxyChapter'

interface ChapterProps {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}

/** 沉浸场景注册表：新增章节 = 建目录 + 这里注册一行 */
export const CHAPTER_REGISTRY: Record<string, ComponentType<ChapterProps>> = {
  nebula: NebulaChapter,
  protostar: ProtostarChapter,
  'main-sequence': MainSequenceChapter,
  'red-giant': RedGiantChapter,
  'white-dwarf': WhiteDwarfChapter,
  'neutron-star': NeutronStarChapter,
  'black-hole': BlackHoleChapter,
  galaxy: GalaxyChapter,
}
