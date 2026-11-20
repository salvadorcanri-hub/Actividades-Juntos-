import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export const COVER_IMAGES = {
  ept: '/src/assets/images/cover_ept_project_1794761780666.jpg',
  debate: '/src/assets/images/cover_debate_project_1794761783124.jpg',
  science: '/src/assets/images/cover_science_default_1794761783988.jpg',
} as const;

export const COVER_PRESETS = [
  {
    id: 'ept',
    label: 'Estudio Creativo y Prototipos',
    url: COVER_IMAGES.ept,
  },
  {
    id: 'debate',
    label: 'Auditorio y Debate Académico',
    url: COVER_IMAGES.debate,
  },
  {
    id: 'science',
    label: 'Laboratorio y Trabajo en Equipo',
    url: COVER_IMAGES.science,
  },
] as const;

export const STUDENT_AVATARS = {
  female: '/src/assets/images/avatar_student_female_1794761784153.jpg',
  male: '/src/assets/images/avatar_student_male_1794761785291.jpg',
} as const;

const FEMALE_NAMES = [
  'valeria',
  'lucía',
  'lucia',
  'camila',
  'andrea',
  'ana',
  'elena',
  'sofía',
  'sofia',
  'maría',
  'maria',
  'paula',
  'carla',
];

export function getMemberAvatarUrl(memberName: string): string {
  const lower = memberName.trim().toLowerCase();
  const isFemale = FEMALE_NAMES.some((n) => lower.includes(n));
  return isFemale ? STUDENT_AVATARS.female : STUDENT_AVATARS.male;
}

export function getGroupCoverUrl(groupId: string, groupName: string, customCover?: string): string {
  if (customCover) return customCover;
  if (groupId.includes('ept') || groupName.toLowerCase().includes('ept')) {
    return COVER_IMAGES.ept;
  }
  if (
    groupId.includes('com') ||
    groupName.toLowerCase().includes('debate') ||
    groupName.toLowerCase().includes('comunicación')
  ) {
    return COVER_IMAGES.debate;
  }
  return COVER_IMAGES.science;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'AL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

interface StudentAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  size = 'sm',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarUrl = getMemberAvatarUrl(name);
  const initials = getInitials(name);

  // Subtle deterministic ring/tint per student
  const accentColors = [
    'border-sky-400/50 bg-sky-950 text-sky-200',
    'border-emerald-400/50 bg-emerald-950 text-emerald-200',
    'border-amber-400/50 bg-amber-950 text-amber-200',
    'border-indigo-400/50 bg-indigo-950 text-indigo-200',
  ];
  const colorIdx =
    name
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    accentColors.length;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm',
  }[size];

  if (imgFailed) {
    return (
      <div
        title={name}
        className={`${sizeClasses} rounded-full border font-display font-bold flex items-center justify-center shrink-0 select-none ${accentColors[colorIdx]} ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      title={name}
      className={`${sizeClasses} relative rounded-full border overflow-hidden shrink-0 select-none ${accentColors[colorIdx]} ${className}`}
    >
      <img
        src={avatarUrl}
        alt={`Avatar de ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

interface GroupCoverBannerProps {
  src: string;
  alt: string;
  className?: string;
}

export const GroupCoverBanner: React.FC<GroupCoverBannerProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        className={`bg-gradient-to-br from-sky-950 via-[#111827] to-indigo-950 flex items-center justify-center ${className}`}
      >
        <Sparkles className="w-6 h-6 text-sky-400/30" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};
