export type CategoryCode =
  | 'SENIOR'
  | 'VETERAN'
  | 'JUNIOR'
  | 'CADET'
  | 'MINIME'
  | 'BENJAMIN'
  | 'POUSSIN'
  | 'MINIBAD'

export const CATEGORY_ORDER: CategoryCode[] = [
  'MINIBAD',
  'POUSSIN',
  'BENJAMIN',
  'MINIME',
  'CADET',
  'JUNIOR',
  'SENIOR',
  'VETERAN',
]

export type AppliesTo = 'ALL' | 'MINOR' | 'MAJOR'
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type PaymentStatus = 'UNPAID' | 'PAID'
export type ParentIdType = 'CNI' | 'PERMIS'
export type Gender = 'MALE' | 'FEMALE'

export interface RequiredDocumentPublic {
  id: number
  key: string
  label_ar: string
  label_en: string
  label_vi: string
  required: boolean
  applies_to: AppliesTo
}

export interface RequiredDocumentAdmin extends RequiredDocumentPublic {
  order: number
  active: boolean
}

export interface UploadedDocument {
  id: number
  document_key: string
  label_en: string
  label_ar: string
  label_vi: string
  original_name: string
  uploaded_at: string
}

export interface RegistrationPersonalInput {
  gender?: Gender | ''
  first_name: string
  last_name: string
  latin_full_name: string
  birth_date: string
  birth_place: string
  address: string
  phone: string
  education_level?: string
  institution?: string
  parent_name?: string
  parent_id_type?: ParentIdType | ''
  parent_id_number?: string
  parent_id_issue_date?: string
}

export interface Registration extends RegistrationPersonalInput {
  id: number
  reference: string
  gender_display: string
  club: number | null
  club_name: string
  club_name_ar: string
  center: number | null
  center_name: string
  wilaya_name: string
  category: CategoryCode
  category_display: string
  is_minor: boolean
  age_at_registration: number
  status: RegistrationStatus
  payment_status: PaymentStatus
  season: string
  created_at: string
  documents: UploadedDocument[]
}

export interface RegistrationListItem {
  id: number
  reference: string
  gender: Gender | ''
  gender_display: string
  club_name: string
  center_name: string
  first_name: string
  last_name: string
  category: CategoryCode
  category_display: string
  is_minor: boolean
  age_at_registration: number
  status: RegistrationStatus
  payment_status: PaymentStatus
  season: string
  created_at: string
  document_count: number
}

export interface AdminStats {
  total: number
  minors: number
  majors: number
  pending: number
  approved: number
  rejected: number
  paid: number
  unpaid: number
  by_category: Record<CategoryCode, number>
  /** Per-center for a club owner, per-club for a super admin. */
  breakdown_by: 'club' | 'center'
  breakdown: { id: number | null; name: string; total: number; paid: number }[]
}

// ── Organization ────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'CLUB_OWNER' | 'BRANCH_MANAGER'

export interface Wilaya {
  id: number
  code: number
  name_ar: string
  name_en: string
}

export interface BranchManagerSummary {
  id: number
  email: string
  full_name: string
  is_active: boolean
  last_login: string | null
}

export interface Center {
  id: number
  club: number
  name_ar: string
  name_en: string
  address: string
  active: boolean
  /** Present on admin responses: who runs this branch. */
  managers?: BranchManagerSummary[]
  registration_count?: number
}

export interface Club {
  id: number
  wilaya: number
  wilaya_name_ar: string
  wilaya_name_en: string
  name_ar: string
  name_en: string
  owner: number | null
  owner_username: string | null
  owner_name: string
  address: string
  phone: string
  email: string
  active: boolean
  centers: Center[]
  registration_count: number
}

export interface PublicClub {
  id: number
  wilaya: number
  name_ar: string
  name_en: string
  centers: Center[]
}

export interface Directory {
  wilayas: Wilaya[]
  clubs: PublicClub[]
}

export interface AdminUser {
  id: number
  username: string
  email: string
  role: UserRole
  club: number | null
  club_name: string | null
  center: number | null
  center_name: string | null
  full_name: string
  phone: string
  is_active: boolean
  last_login: string | null
}

export type AwardKind = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTICIPATION'

export interface AwardRow {
  participant: { id: number; name: string; club: string }
  award: AwardKind
  place: number | null
}

export interface SiteSettings {
  active_season: string
  registrations_open: boolean
  closed_message_ar: string
  closed_message_en: string
  closed_message_vi: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── Competitions ────────────────────────────────────────────────────────────

export type CompetitionType = 'COMBAT' | 'TECHNIQUE'
export type CompetitionStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED'
export type MatchStatus = 'PENDING' | 'LIVE' | 'COMPLETED' | 'BYE'
export type PerformanceStatus = 'PENDING' | 'LIVE' | 'COMPLETED'
export type Medal = 'GOLD' | 'SILVER' | 'BRONZE'

export interface Competition {
  id: number
  name: string
  type: CompetitionType
  type_display: string
  season: string
  gender: 'MALE' | 'FEMALE' | 'MIXED'
  status: CompetitionStatus
  weight_class: string
  weight_class_display: string
  rounds_per_match: number
  technique_event: string
  technique_event_display: string
  prescribed_form: string
  judge_count: number
  scoring_mode: 'TRIMMED' | 'AVERAGE'
  max_score: string
  participant_count: number
  created_at: string
}

export interface CompetitionParticipant {
  id: number
  name: string
  club: string
  seed: number
  withdrawn?: boolean
}

export interface ScoringEvent {
  id: number
  participant: number
  kind: 'POINT' | 'PENALTY' | 'WARNING'
  points: number
  technique: string
  round_number: number
  judge_username?: string
  created_at: string
}

export interface Match {
  id: number
  round_number: number
  position: number
  participant_a: CompetitionParticipant | null
  participant_b: CompetitionParticipant | null
  winner: CompetitionParticipant | null
  status: MatchStatus
  current_round: number
  score_a: number
  score_b: number
  next_match: number | null
  next_slot: string
  started_at: string | null
  finished_at: string | null
  scoring_events?: ScoringEvent[]
  competition_id?: number
  competition_name?: string
  rounds_per_match?: number
}

export interface JudgeScore {
  id: number
  judge_name: string
  score: string
  notes: string
}

export interface Performance {
  id: number
  competition: number
  participant: CompetitionParticipant
  order: number
  form_name: string
  status: PerformanceStatus
  final_score: string | null
  penalty: string
  notes: string
  judge_scores: JudgeScore[]
}

export interface CompetitionDetail extends Competition {
  participants: CompetitionParticipant[]
  matches: Match[]
  performances: Performance[]
}

export interface StandingRow {
  place: number
  medal: Medal | null
  score: string | null
  participant: { id: number; name: string; club: string }
}

export interface CompetitionReference {
  male_weight_classes: { value: string; label: string }[]
  female_weight_classes: { value: string; label: string }[]
  technique_events: { value: string; label: string }[]
  prescribed_quyen_male: string[]
  prescribed_quyen_female: string[]
  required_pre_bout_techniques: number
}

export interface DisplayState {
  competition: Competition
  standings: StandingRow[] | null
  live_match: Match | null
  live_performance: Performance | null
  matches: Match[] | null
  performances: Performance[] | null
}

// ── Training groups (أفواج) and the weekly timetable ────────────────────────

export interface WeeklySession {
  id: number
  group: number
  weekday: number
  weekday_display: string
  start_time: string
  end_time: string
  note: string
}

export interface GroupMember {
  id: number
  reference: string
  full_name: string
  latin_full_name: string
  gender: Gender | ''
  category: CategoryCode
  category_display: string
  payment_status: PaymentStatus
}

export interface TrainingGroup {
  id: number
  club: number
  club_name: string
  center: number | null
  center_name: string
  name_ar: string
  name_en: string
  coach: string
  capacity: number
  active: boolean
  sessions: WeeklySession[]
  members: GroupMember[]
  member_count: number
  created_at: string
}

export interface TimetableDay {
  weekday: number
  label: string
  sessions: {
    id: number
    group: number
    group_name_en: string
    group_name_ar: string
    center_name: string
    coach: string
    start_time: string
    end_time: string
    member_count: number
    note: string
  }[]
}

// ── Community ────────────────────────────────────────────────────────────────

export interface GalleryPhoto {
  id: number
  image_url: string
  caption_ar: string
  caption_en: string
  caption_vi: string
}

export interface AdminGalleryPhoto extends GalleryPhoto {
  club: number | null
  club_name: string
  order: number
  active: boolean
  created_at: string
}

export type PostKind = 'NEWS' | 'EVENT' | 'RESULT'
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface PostMedia {
  id: number
  kind: 'IMAGE' | 'VIDEO'
  url: string
  poster_url: string
  alt_text: string
  order: number
}

export interface Post {
  id: number
  slug: string
  kind: PostKind
  club: number | null
  club_name: string
  club_name_ar: string
  author_name: string
  title_ar: string
  title_en: string
  title_vi: string
  body_ar: string
  body_en: string
  body_vi: string
  media: PostMedia[]
  pinned: boolean
  published_at: string | null
  event_starts_at: string | null
  location: string
  like_count: number
  comment_count: number
  comments_enabled: boolean
  liked: boolean
}

export interface AdminPost extends Omit<Post, 'liked'> {
  author: number | null
  status: PostStatus
  rank_score: number
  is_live: boolean
  created_at: string
  updated_at: string
}

export interface PostComment {
  id: number
  author_name: string
  body: string
  created_at: string
}

export interface AdminPostComment extends PostComment {
  post: number
  post_title: string
  post_slug: string
  status: 'PUBLISHED' | 'HIDDEN'
  ip_address: string | null
  user_agent: string
}

export interface Feed {
  count: number
  page: number
  page_size: number
  has_next: boolean
  results: Post[]
}

export interface ActivityEntry {
  id: number
  actor_label: string
  action: string
  action_display: string
  target: string
  detail: Record<string, unknown>
  club: number | null
  club_name: string
  center: number | null
  center_name: string
  created_at: string
}
