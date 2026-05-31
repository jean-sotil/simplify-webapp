import { supabaseAdmin } from '../src/lib/db.server'

async function main() {
  console.log('Testing Supabase connectivity...')

  // Insert a test team
  const { data: team, error: insertError } = await supabaseAdmin
    .from('teams')
    .insert({ name: 'Test Team (connectivity check)' })
    .select()
    .single()

  if (insertError) {
    console.error('INSERT failed:', insertError.message)
    process.exit(1)
  }

  console.log('INSERT OK — team id:', team.id)

  // Query it back
  const { data: fetched, error: selectError } = await supabaseAdmin
    .from('teams')
    .select()
    .eq('id', team.id)
    .single()

  if (selectError) {
    console.error('SELECT failed:', selectError.message)
    process.exit(1)
  }

  console.log('SELECT OK — name:', fetched.name)

  // Delete it
  const { error: deleteError } = await supabaseAdmin
    .from('teams')
    .delete()
    .eq('id', team.id)

  if (deleteError) {
    console.error('DELETE failed:', deleteError.message)
    process.exit(1)
  }

  console.log('DELETE OK')
  console.log('✅ Database connectivity test passed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
