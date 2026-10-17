const SIZES = { xs: 'h-5 w-5 text-[9px]', sm: 'h-8 w-8 text-sm', md: 'h-11 w-11 text-lg', lg: 'h-16 w-16 text-2xl' }

// Avatar con iniciales (simula la foto de perfil de Google).
export default function Avatar({ user, size = 'md', className = '' }) {
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-ink-950 ${user.avatar} ${SIZES[size]} ${className}`}>
      {initials}
    </div>
  )
}
