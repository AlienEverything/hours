# Roster and hours import

Imported on 2026-11-13 from the files supplied in `/workspace/hours/`.

## Counts and meaning

- 162 students across seven classes: 161 photographed roster entries plus the user-supplied حسن حمزة الشخص in class 202.
- 27 reported total-hour balances from the 54-page `hours.pdf`; total **4,273 hours**.
- 26 students have positive reported hours; one student explicitly reported zero.
- 135 students have no supplied hour record. Their stored `hours: 0` is accompanied by `recorded: false`; it is not evidence that they have completed zero hours.
- Fractional totals are retained exactly: 61.5 and 27.5 hours.
- Every PDF balance was matched once. Balances are not added to one another or treated as separate activity entries.
- English names are readable transliterations generated from the Arabic names, not verified official English spellings.
- The source does not identify the school name. The PDF title is «عدد الساعات التطوعية».

| Class | Roster students | Reported balances | Reported hours |
| --- | ---: | ---: | ---: |
| 101 | 21 | 2 | 27.5 |
| 102 | 26 | 3 | 471.5 |
| 103 | 21 | 0 | 0 |
| 201 | 28 | 7 | 1521 |
| 202 | 28 | 11 | 1066 |
| 301 | 20 | 1 | 256 |
| 302 | 18 | 3 | 931 |

## Matching method

Each PDF submission’s selected class was read from the green radio button, not inferred from the name. The Arabic name was then matched against the corresponding class image. The table below records the explicit roster ID for every PDF entry. Differences consisting of omitted `بن`, omitted intermediate ancestors, and ordinary hamza/ta-marbuta spelling were checked against a unique compatible name within that class. No hours were guessed for unmatched roster students.

PDF page 43 and roster 102 row 12 both read `الخلوف`. An initial transcription of that roster surname as `الخلف` was corrected after two agents rechecked an enlarged crop. Class 101 row 11 was also rechecked and corrected to `علي بن محمد بن سعيد الخرس`.

## PDF-to-roster matches

| PDF page | PDF name | Class | Hours | Student ID | Matched roster name |
| ---: | --- | --- | ---: | --- | --- |
| 1 | علي ناصر السلمان | 201 | 80 | 201-18 | علي بن ناصر بن عبدالمحسن السلمان |
| 3 | مختار الموسى | 302 | 89 | 302-15 | مختار بن مهدي بن محمد الموسى |
| 5 | أحمد محمد احمد الدندن | 201 | 451 | 201-01 | احمد بن محمد بن احمد الدندن |
| 7 | علي الخليفه | 101 | 0 | 101-13 | علي منير بن محمد الخليفه |
| 9 | عبدالله محمد الحاجي | 202 | 140 | 202-12 | عبدالله بن محمد بن عبدالله الحاجي |
| 11 | عباس قاسم موسى الهفوفي | 102 | 325 | 102-10 | عباس بن قاسم بن موسى الهفوفي |
| 13 | محمد بن هاشم بن علي الهاشم | 302 | 350 | 302-14 | محمد بن هاشم بن علي الهاشم |
| 15 | عبدالحكيم علي بن عمران الاحمد | 302 | 492 | 302-08 | عبدالحكيم علي بن عمران الاحمد |
| 17 | حسن السليم | 301 | 256 | 301-04 | حسن بن هاني بن ابراهيم السليم |
| 19 | قاسم مرتضى السلمان | 201 | 549 | 201-21 | قاسم بن مرتضى بن علي السلمان |
| 21 | ليث خالد حسين الدندن | 202 | 140 | 202-19 | ليث بن خالد بن حسين الدندن |
| 23 | أسامة أحمد صالح العيسى | 102 | 61.5 | 102-03 | اسامه بن احمد بن صالح العيسى |
| 25 | عبدالهادي علي محمد البدر | 202 | 4 | 202-13 | عبدالهادي بن علي بن محمد البدر |
| 27 | محمد عبدالعزيز الخميس | 201 | 120 | 201-24 | محمد بن عبدالعزيز بن محمد الخميس |
| 29 | علي مصطفى صادق المبارك | 202 | 10 | 202-15 | علي بن مصطفى بن صادق المبارك |
| 31 | الياس حسن السلمان | 201 | 173 | 201-04 | الياس بن حسن بن جواد السلمان |
| 33 | محمد علي الحاجي | 202 | 130 | 202-26 | محمد علي بن ياسين الحاجي |
| 35 | المنتظر عدنان المنسف | 202 | 40 | 202-03 | المنتظر بن عدنان بن سماعيل المنسف |
| 37 | علي محمد الغانم | 202 | 51 | 202-14 | علي بن محمد بن فهد الغانم |
| 39 | حسن محمد خميس المشعل | 202 | 48 | 202-07 | حسن بن محمد بن خميس المشعل |
| 41 | حسين محمد خميس المشعل | 202 | 48 | 202-09 | حسين بن محمد بن خميس المشعل |
| 43 | عبدالعزيز عبدالمنعم الخلوف | 102 | 85 | 102-12 | عبدالعزيز بن عبدالمنعم بن محمد الخلوف |
| 45 | ميثم جميل علي الشهابي | 202 | 277 | 202-27 | ميثم بن جميل بن علي الشهابي |
| 47 | حسن عبدالله محمد السعد | 202 | 178 | 202-06 | حسن بن عبدالله بن محمد السعد |
| 49 | سجاد حسن الخويتم | 201 | 70 | 201-11 | سجاد بن حسن جواد الخويتم |
| 51 | حسن مرتضى حسن الخلف | 101 | 27.5 | 101-05 | حسن بن مرتضى بن حسن الخلف |
| 53 | رائد فاضل الحبرتي | 201 | 78 | 201-07 | رائد بن فاضل بن طاهر الحبرتي |

## Source checks and uncertainties

These literal roster readings are retained rather than silently replaced with a more familiar surname. They should be confirmed from a clearer image or by the school. This does not establish a conflicting student identity; most have no supplied hours.

| Student ID | Retained Arabic name | Source / uncertainty |
| --- | --- | --- |
| 102-04 | المجتبى بن يوسف بن ابراهيم الابوي | `102.jpeg`, row 4: surname may be `الابري`. |
| 201-02 | احمد بن حسين بن محمد اللويم | `201.jpeg`, row 2: low-confidence surname reading `اللويم`. |
| 201-06 | رائد بن عبداللطيف بن محمد الدجاني | `201.jpeg`, row 6: low-confidence surname reading `الدجاني`. |
| 201-07 | رائد بن فاضل بن طاهر الحبرتي | `201.jpeg`, row 7: surname `الحبرتي` also supported by PDF page 53. |
| 301-02 | حزام صالح حزام الجبهه | `301.jpeg`, row 2: low-confidence surname reading `الجبهه`. |
| 302-02 | القاسم بن حسين بن عبدالله الوباري | `302.jpeg`, row 2: low-confidence surname reading `الوباري`. |

Additional checks:

- PDF page 3 has unclear text encoding/typography for مختار’s surname. The class 302 roster identifies him as `مختار بن مهدي بن محمد الموسى`.
- PDF page 49 and the roster were cross-checked to resolve `سجاد بن حسن جواد الخويتم`.
- `حسن بن محمد بن خميس المشعل` (202-07) and `حسين بن محمد بن خميس المشعل` (202-09) are separate photographed roster entries. Each has a separate 48-hour submission, on PDF pages 39 and 41. Both are included; neither was deduplicated.
- `حسن حمزة الشخص` (202-28) was added exactly as supplied by the user. No hour balance was supplied for him.
- Class 103 has no submitted hour balances in the supplied PDF. Its 21 students remain unrecorded.

## Sources

- `/workspace/hours/101.jpeg` through `/workspace/hours/302.jpeg`, for the seven listed classes.
- `/workspace/hours/hours.pdf`, odd-numbered pages 1–53 contain names, classes, and hour balances; following even pages show attachment fields.
- User instruction adding حسن حمزة الشخص to class 202.

The supplied scans are not copied into the public application bundle. `students.json` contains only the requested roster and hour data plus import notes.
