// ================================================
// District Friends Finder
// Craig Topple for District 5 Commissioner
// ================================================

const VOTER_URL = 'https://www.dropbox.com/scl/fi/3pgz7vpw7uyctve5cyb1i/voter_dict.json?rlkey=la5qafbafhtp1tmtt6ohnssm3&dl=1'

const MESSAGE = (firstName) =>
  `Hey ${firstName}! I'm reaching out because I'm supporting Craig Topple for District 5 Commissioner. ` +
  `Since we know each other, I wanted to make sure you knew the election is coming up — every vote matters. ` +
  `I'd love your support! Let me know if you have any questions. 🗳️`

async function run() {

  // --- Load voter list ---
  let voterDict
  try {
    let req = new Request(VOTER_URL)
    req.timeoutInterval = 30
    voterDict = await req.loadJSON()
  } catch(e) {
    let alert = new Alert()
    alert.title = 'Connection Error'
    alert.message = 'Could not load the voter list. Please check your internet connection and try again.'
    alert.addAction('OK')
    await alert.present()
    return
  }

  // --- Load contacts ---
  let container = await ContactsContainer.default()
  let contacts = await Contact.all([container])

  // --- Build phone number map from contacts ---
  let contactMap = new Map()
  for (let contact of contacts) {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) continue
    let firstName = (contact.givenName || '').trim()
    let lastName = (contact.familyName || '').trim()
    let fullName = [firstName, lastName].filter(Boolean).join(' ')
    if (!fullName) continue
    for (let phoneObj of contact.phoneNumbers) {
      let digits = phoneObj.value.replace(/\D/g, '')
      if (digits.length >= 10) {
        contactMap.set(digits.slice(-10), { fullName, firstName: firstName || fullName })
      }
    }
  }

  // --- Find matches ---
  let matches = []
  for (let [voterPhone, voterInfo] of Object.entries(voterDict)) {
    if (voterPhone.length !== 10) continue  // skip 11-digit entries
    if (contactMap.has(voterPhone)) {
      let voterName = voterInfo.split('|||')[0]
      let contact = contactMap.get(voterPhone)
      matches.push({ voterPhone, voterName, contactFullName: contact.fullName, contactFirstName: contact.firstName })
    }
  }

  // --- No matches ---
  if (matches.length === 0) {
    let alert = new Alert()
    alert.title = 'No Matches Found'
    alert.message = 'None of your contacts appear in the district voter list.'
    alert.addAction('OK')
    await alert.present()
    return
  }

  // --- Show results ---
  let table = new UITable()
  table.showSeparators = true

  // Header row
  let headerRow = new UITableRow()
  headerRow.isHeader = true
  headerRow.addText(`🗳️ ${matches.length} District Friend${matches.length !== 1 ? 's' : ''} Found`)
  table.addRow(headerRow)

  // Instruction row
  let instrRow = new UITableRow()
  instrRow.height = 40
  let instrCell = instrRow.addText('Tap a name to send them a message.')
  instrCell.titleColor = Color.gray()
  instrCell.titleFont = Font.systemFont(13)
  table.addRow(instrRow)

  // One row per match
  for (let match of matches) {
    let row = new UITableRow()
    row.height = 60
    row.dismissOnSelect = false
    row.addText(match.contactFullName, 'Voter: ' + match.voterName)
    row.onSelect = () => {
      let msg = MESSAGE(match.contactFirstName)
      let url = `sms:${match.voterPhone}&body=${encodeURIComponent(msg)}`
      Safari.open(url)
    }
    table.addRow(row)
  }

  await QuickLook.present(table)
}

await run()
