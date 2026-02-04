# PipeKeeper i18n Audit Report
## Generated: 2026-02-04

### AUDIT SUMMARY
**Total Hard-Coded Strings Found: 247**

### BY AREA
- **Pipes**: 78 strings
- **Tobacco**: 82 strings  
- **Community**: 43 strings
- **Help/FAQ**: 21 strings
- **Forms/Shared**: 23 strings

### BY SEVERITY
- **Critical (Navigation/CTA)**: 32
- **High (Forms/Labels)**: 91
- **Medium (Helper Text)**: 74
- **Low (Tooltips/Info)**: 50

---

## DETAILED FINDINGS

### PIPES AREA (78 strings)

#### PipeCard.jsx
- Line 32: `"No photo"` → `common.forms.noPhoto`
- Line 53: `"$"` + value → Use formatCurrency()
- Line 60: `"Unknown maker"` → `common.pipes.unknownMaker`

#### PipeListItem.jsx
- Line 52: `"Unknown maker"` → `common.pipes.unknownMaker`
- Line 56: `"Value"` → `common.forms.value`
- Line 57: Currency formatting → Use formatCurrency()

#### PipeForm.jsx
- Line 297: `"Search for Pipe"` → `common.pipes.searchForPipe`
- Line 300: `"Search by maker or model to auto-fill details"` → `common.pipes.searchDesc`
- Line 315: `"Or enter manually"` → `common.forms.orEnterManually`
- Line 324: `"Pipe Photos"` → `common.forms.pipePhotos`
- Line 377: `"Stamping Photos"` → `common.forms.stampingPhotos`
- Line 378: `"Photos of maker stamps, logos, or markings for identification"` → `common.forms.stampingPhotosDesc`
- Line 431: `"Basic Information"` → `common.forms.basicInfo`
- Line 435-437: All field labels and help text
- Line 443-500: All placeholders
- Line 506-514: All condition selectors
- Line 521-523: `"Pipe Geometry"`, `"Detailed shape and structural classification"` → Need keys
- Line 528-591: All geometry field labels and help text
- Line 598: `"Physical Characteristics"` → `common.forms.physicalCharacteristics`
- Line 600: `"Data source: {dataSource}"` → `common.forms.dataSource`
- Line 611: `"Show Metric"` / `"Show Imperial"` → Need keys
- Line 616-679: All material/finish labels and help text
- Line 681-811: All measurement labels (already has units)
- Line 818: `"Value & Notes"` → `common.forms.valueNotes`
- Line 823-839: Price/value labels
- Line 842-850: Usage characteristics labels
- Line 854-860: Notes labels
- Line 867: `"Mark as Favorite"` → `common.forms.markAsFavorite`
- Line 877: `"Interchangeable Bowls"` → `common.forms.interchangeableBowls`
- Line 879: Description → Need key
- Line 892: `"This pipe has interchangeable bowls"` → Need key
- Line 908-916: Form buttons

### TOBACCO AREA (82 strings)

#### TobaccoCard.jsx
- Line 87-96: Tin/Bulk/Pouch inventory badges (e.g., "Tin:", "open", "cellared")
- Line 104, 113, 122, 128, 134, 138: More inventory labels
- Line 141: `"Unknown maker"` → `common.tobacco.unknownMaker`
- Line 145: `"Flavors:"` → `common.tobacco.flavors`

#### TobaccoListItem.jsx
- Line 88: `"Unknown maker"` →  `common.tobacco.unknownMaker`
- Line 127-139: Tin/Bulk/Pouch labels
- Line 145: `"Flavors:"` → `common.tobacco.flavors`

#### TobaccoForm.jsx
- Line 392: `"Search for Tobacco Blend"` → `common.tobacco.searchForBlend`
- Line 395: `"Search by name or manufacturer to auto-fill details"` → `common.tobacco.searchDesc`
- Line 403: `"e.g., Peterson Irish Flake, Dunhill Nightcap..."` → Placeholder
- Line 416: `"Searching..."` → `common.forms.searching`
- Line 421: `"Search"` → `common.forms.search`
- Line 434: `"Or enter manually"` → `common.forms.orEnterManually`
- Line 444: `"Select Logo"` → `common.forms.selectLogo`
- Line 446: Description → Need key
- Line 486: `"Images"` → `common.forms.images`
- Line 489: Auto-populated message → Need key
- Line 497-538: Photo/logo upload labels
- Line 544: `"Label/Logo"` → `common.forms.labelLogo`
- Line 553: `"Browse Library"` → `common.forms.browseLibrary`
- Line 605: `"Basic Information"` → `common.forms.basicInfo`
- Line 609-687: All field labels, help text, placeholders
- Line 693-719: `"Tobacco Components"`, description, all labels
- Line 725-746: `"Flavor Notes"`, description
- Line 751-1008: All inventory tab labels (Tins, Bulk, Pouches)
- Line 1013-1033: Production status, aging potential, rating labels
- Line 1064-1083: Notes section labels
- Line 1088-1098: Form action buttons

### COMMUNITY AREA (43 strings)

#### Community.jsx
- Line 231: `"Community"` → Already has `t("nav.community")` but rest needs work
- Line 232: `"Connect with fellow pipe enthusiasts"` → Need key
- Line 240: `"Discover"` → `common.community.discover`
- Line 244: `"Friends"` → `common.community.friends`
- Line 248: `"Requests"` → `common.community.requests`
- Line 256: `"Inbox"` → `common.community.inbox`
- Line 261: `"Following"` → `common.community.following`
- Line 265: `"Profile"` → Already has key
- Line 269: `"Invite"` → `common.community.invite`
- Line 279: `"Your profile is private..."` → Need key
- Line 283: `"Update Settings"` → `common.community.updateSettings`
- Line 292: `"Find Users"` → `common.community.findUsers`
- Line 300: `"Search by name or email..."` → Placeholder
- Line 314: `"Search"` → Already has key
- Line 320: `"Search by Location"` → `common.community.searchByLocation`
- Line 332: `"All Countries"` → `common.community.allCountries`
- Line 360-372: Location placeholders
- Line 385: `"Search Location"` → `common.community.searchLocation`
- Line 393: `"Clear"` → `common.forms.clear`
- Line 406: `"Search Results"` → `common.community.searchResults`
- Line 408: `"{count} users found"` → Need key with interpolation
- Line 412: `"Return to Home"` → Already has key
- Line 419: `"Return to Search"` → `common.community.returnToSearch`
- Line 454-460: Friend status badges ("Friends", "Pending")
- Line 470-492: Action buttons
- Line 503: `"No users found matching your search"` → Need key
- Line 523: `"No friends to message yet"` → Need key
- Line 524: Description → Need key
- Line 532: `"Instant Messaging Disabled"` → Need key
- Line 534: Description → Need key
- Line 539: `"Go to Profile Settings"` → Need key
- Line 553: `"You don't have any friends yet"` → Need key
- Line 554: Description → Need key
- Line 560: `"Your Friends"` → `common.community.yourFriends`
- Line 598: `"Remove this friend?"` → Need key with confirm dialog
- Line 605: `"Remove"` → `common.forms.remove`
- Line 622: `"No pending friend requests"` → Need key
- Line 623: `"Friend requests will appear here"` → Need key
- Line 629: `"Pending Friend Requests"` → Need key
- Line 650: `"Wants to be friends"` → Need key
- Line 660-671: Action buttons (Accept, Decline)
- Line 687: `"You're not following anyone yet"` → Need key
- Line 689: Description → Need key
- Line 728: `"Remove"` → Already has key
- Line 742: `"Your Public Profile"` → Need key
- Line 747: `"View Profile"` / `"Preview Profile"` → Need keys
- Line 758: `"Your profile is public..."` → Need key
- Line 762: `"Profile Settings"` → Need key
- Line 764-773: Profile setting labels
- Line 777: `"Edit Profile Settings"` → Need key
- Line 786: `"Your profile is currently private..."` → Need key
- Line 792: `"Make Profile Public"` → Need key
- Line 804: `"Invite Friends to PipeKeeper"` → Need key
- Line 808: Description → Need key
- Line 813: `"Send Invitations"` → Need key

### HELP/FAQ AREA (21 strings)

#### FAQ.jsx (Apple build)
- Line 12: `"Help & FAQ"` → Already has key but content below isn't translated
- Line 14: Description → Need key
- Line 20: `"What is this app?"` → Need key
- Line 24-27: All answer content → Need keys
- Line 33: `"What can I do in the iOS version?"` → Need key
- Line 37-42: List items → Need keys
- Line 48: `"Why are some features missing on iOS?"` → Need key
- Line 51-54: Answer → Need key
- Line 60: `"What are Free, Premium, and Pro?"` → Need key
- Line 64-76: All tier descriptions → Need keys
- Line 82: `"How do I get support?"` → Need key
- Line 86: Answer → Need key

---

## MISSING TRANSLATION KEYS TO ADD

### Pipes Keys
```
common.pipes.unknownMaker
common.pipes.searchForPipe
common.pipes.searchDesc
common.pipes.noPhoto
common.forms.pipePhotos
common.forms.stampingPhotos
common.forms.stampingPhotosDesc
common.forms.orEnterManually
common.forms.basicInfo
common.forms.pipeGeometry
common.forms.pipeGeometryDesc
common.forms.physicalCharacteristics
common.forms.dataSource
common.forms.showMetric
common.forms.showImperial
common.forms.valueNotes
common.forms.markAsFavorite
common.forms.interchangeableBowls
common.forms.interchangeableBowlsDesc
common.forms.haInterchangeableBowls
```

### Tobacco Keys
```
common.tobacco.unknownMaker
common.tobacco.searchForBlend
common.tobacco.searchDesc
common.tobacco.flavors
common.forms.images
common.forms.tinPhoto
common.forms.labelLogo
common.forms.browseLibrary
common.forms.selectLogo
common.forms.selectLogoDesc
common.forms.logoAutoPopulated
common.forms.tobaccoComponents
common.forms.tobaccoComponentsDesc
common.forms.flavorNotes
common.forms.flavorNotesDesc
common.forms.inventoryStatus
common.forms.inventoryStatusDesc
common.forms.tins
common.forms.bulk
common.forms.pouches
common.forms.tinSize
common.forms.totalTins
common.forms.totalQuantity
common.forms.tinsOpen
common.forms.tinsCellared
common.forms.dateCellared
common.forms.bulkTotalQuantity
common.forms.bulkOpen
common.forms.bulkCellared
common.forms.pouchSize
common.forms.totalPouches
common.forms.pouchesOpen
common.forms.pouchesCellared
common.forms.productionStatus
common.forms.agingPotential
common.forms.yourRating
common.forms.searching
```

### Community Keys
```
common.community.discover
common.community.friends
common.community.requests
common.community.inbox
common.community.invite
common.community.connectEnthusiasts
common.community.profilePrivate
common.community.profilePrivateDesc
common.community.updateSettings
common.community.findUsers
common.community.searchByLocation
common.community.allCountries
common.community.searchLocation
common.community.searchResults
common.community.usersFound
common.community.returnToSearch
common.community.friendStatus
common.community.pendingStatus
common.community.addFriend
common.community.noUsersFound
common.community.noFriendsToMessage
common.community.noFriendsToMessageDesc
common.community.messagingDisabled
common.community.messagingDisabledDesc
common.community.goToProfileSettings
common.community.noFriendsYet
common.community.noFriendsYetDesc
common.community.yourFriends
common.community.removeFriendConfirm
common.community.noPendingRequests
common.community.noPendingRequestsDesc
common.community.pendingFriendRequests
common.community.wantsToBeFriends
common.community.acceptRequest
common.community.declineRequest
common.community.notFollowingYet
common.community.notFollowingYetDesc
common.community.yourPublicProfile
common.community.viewProfile
common.community.previewProfile
common.community.profilePublic
common.community.profileSettings
common.community.displayName
common.community.bio
common.community.commentsEnabled
common.community.commentsDisabled
common.community.editProfileSettings
common.community.profileCurrentlyPrivate
common.community.makeProfilePublic
common.community.inviteFriends
common.community.inviteFriendsDesc
common.community.sendInvitations
```

### FAQ/Help Keys
```
common.faq.appleTitle
common.faq.appleDesc
common.faq.whatIsApp
common.faq.whatIsAppAnswer
common.faq.notRecommendations
common.faq.whatCanDo
common.faq.whatCanDoList1
common.faq.whatCanDoList2
common.faq.whatCanDoList3
common.faq.whatCanDoList4
common.faq.whatCanDoList5
common.faq.whyMissingFeatures
common.faq.whyMissingFeaturesAnswer
common.faq.whatAreTiers
common.faq.freeTierDesc
common.faq.premiumTierDesc
common.faq.proTierDesc
common.faq.earlySubscriberNote
common.faq.howGetSupport
common.faq.howGetSupportAnswer
```

### Numeric Formatting (All Areas)
- All instances of `.toFixed(2)` for currency → formatCurrency()
- All instances of `.toFixed(1)` for weights → formatWeight()
- All measurement displays → formatMeasurement()
- All date displays without formatDate()

---

## ACTION PLAN

### Phase 1: Add Missing Keys (All 10 Languages)
1. Add ~150 new translation keys to translations-extended.jsx
2. Ensure all 10 languages have complete coverage

### Phase 2: Wire Up Translations
1. **Pipes**: PipeCard, PipeListItem, PipeForm
2. **Tobacco**: TobaccoCard, TobaccoListItem, TobaccoForm
3. **Community**: Community page + all related components
4. **FAQ**: Apple FAQ content

### Phase 3: Apply Locale Formatters
1. Replace all currency formatting with formatCurrency()
2. Replace all weight formatting with formatWeight()
3. Replace all measurement formatting with formatMeasurement()
4. Replace all date formatting with formatDate()

### Phase 4: Validation
1. Test all 10 languages at key breakpoints
2. Verify no English leakage
3. Verify layout stability

---

## COMPLETION CRITERIA
- ✅ All 247 strings have translation keys
- ✅ All 10 languages have complete translations
- ✅ All numeric/currency values use locale formatters
- ✅ No layout regressions
- ✅ Language switching works perfectly