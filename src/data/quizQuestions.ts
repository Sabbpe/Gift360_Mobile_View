export type QuizLang = "en" | "hi" | "mr" | "te" | "ta" | "kn";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type QuizQuestionSet = {
  en: QuizQuestion;
  hi: QuizQuestion;
  mr: QuizQuestion;
  te: QuizQuestion;
  ta: QuizQuestion;
  kn: QuizQuestion;
};

export const LANG_LABELS: Record<QuizLang, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  te: "తెలుగు",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
};

export const LANG_FLAGS: Record<QuizLang, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  mr: "🇮🇳",
  te: "🇮🇳",
  ta: "🇮🇳",
  kn: "🇮🇳",
};

export const ALL_QUESTIONS: QuizQuestionSet[] = [
  // ===== PART 1: KRISHNA'S CHILDHOOD =====
  // Q1
  {
    en: { question: "Krishna was born in which prison city?", options: ["Mathura", "Ujjain", "Varanasi", "Hastinapur"], correctIndex: 0 },
    hi: { question: "कृष्ण किस नगर की कारागार में जन्मे?", options: ["मथुरा", "उज्जैन", "वाराणसी", "हस्तिनापुर"], correctIndex: 0 },
    mr: { question: "कृष्ण कोणत्या नगरातील कारागृहात जन्मले?", options: ["मथुरा", "उज्जैन", "वाराणसी", "हस्तिनापुर"], correctIndex: 0 },
    te: { question: "కృష్ణుడు ఏ నగర కారాగృహంలో జన్మించాడు?", options: ["మథుర", "ఉజ్జయిని", "వారణాసి", "హస్తినాపురం"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணர் எந்த நகரச் சிறையில் பிறந்தார்?", options: ["மதுரா", "உஜ்ஜயினி", "வாரணாசி", "ஹஸ்தினாபுரம்"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣ ಯಾವ ನಗರದ ಕಾರಾಗೃಹದಲ್ಲಿ ಜನಿಸಿದರು?", options: ["ಮಥುರಾ", "ಉಜ್ಜಯಿನಿ", "ವಾರಣಾಸಿ", "ಹಸ್ತಿನಾಪುರ"], correctIndex: 0 },
  },
  // Q2
  {
    en: { question: "Who is Krishna's foster mother?", options: ["Devaki", "Yashoda", "Kunti", "Gandhari"], correctIndex: 1 },
    hi: { question: "कृष्ण की पालक माता कौन हैं?", options: ["देवकी", "यशोदा", "कुंती", "गांधारी"], correctIndex: 1 },
    mr: { question: "कृष्णाची पालक माता कोण आहे?", options: ["देवकी", "यशोदा", "कुंती", "गांधारी"], correctIndex: 1 },
    te: { question: "కృష్ణుని పెంపుడు తల్లి ఎవరు?", options: ["దేవకి", "యశోద", "కుంతి", "గాంధారి"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணரின் வளர்ப்புத் தாய் யார்?", options: ["தேவகி", "யசோதா", "குந்தி", "காந்தாரி"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣನ ಪಾಲಕ ತಾಯಿ ಯಾರು?", options: ["ದೇವಕಿ", "ಯಶೋದ", "ಕುಂತಿ", "ಗಾಂಧಾರಿ"], correctIndex: 1 },
  },
  // Q3
  {
    en: { question: "What is the name of Krishna's flute?", options: ["Veena", "Murali", "Sitar", "Sarangi"], correctIndex: 1 },
    hi: { question: "कृष्ण की बांसुरी का क्या नाम है?", options: ["वीणा", "मुरली", "सितार", "सारंगी"], correctIndex: 1 },
    mr: { question: "कृष्णाच्या वादळ्याचे काय नाव आहे?", options: ["वीणा", "मुरली", "सितार", "सारंगी"], correctIndex: 1 },
    te: { question: "కృష్ణుని వేణువు పేరు ఏమిటి?", options: ["వీణ", "మురళి", "సితార్", "సారంగి"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணரின் புல்லாங்குழலின் பெயர் என்ன?", options: ["வீணா", "முரளி", "சித்தார்", "சரங்கி"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣನ ಕೊಳಲಿನ ಹೆಸರೇನು?", options: ["ವೀಣಾ", "ಮುರಳಿ", "ಸಿತಾರ್", "ಸಾರಂಗಿ"], correctIndex: 1 },
  },
  // Q4
  {
    en: { question: "Which river did baby Krishna cross with Vasudeva?", options: ["Ganga", "Yamuna", "Saraswati", "Narmada"], correctIndex: 1 },
    hi: { question: "शिशु कृष्ण ने वसुदेव के साथ कौन सी नदी पार की?", options: ["गंगा", "यमुना", "सरस्वती", "नर्मदा"], correctIndex: 1 },
    mr: { question: "बालकृष्णाने वसुदेवासोबत कोणती नदी ओलांडली?", options: ["गंगा", "यमुना", "सरस्वती", "नर्मदा"], correctIndex: 1 },
    te: { question: "శిశు కృష్ణుడు వసుదేవునితో ఏ నది దాటాడు?", options: ["గంగ", "యమునా", "సరస్వతి", "నర్మదా"], correctIndex: 1 },
    ta: { question: "குழந்தை கிருஷ்ணர் வசுதேவருடன் எந்த நதியைக் கடந்தார்?", options: ["கங்கை", "யமுனை", "சரஸ்வதி", "நர்மதா"], correctIndex: 1 },
    kn: { question: "ಬಾಲಕೃಷ್ಣ ವಸುದೇವನೊಂದಿಗೆ ಯಾವ ನದಿ ದಾಟಿದರು?", options: ["ಗಂಗೆ", "ಯಮುನೆ", "ಸರಸ್ವತಿ", "ನರ್ಮದೆ"], correctIndex: 1 },
  },
  // Q5
  {
    en: { question: "Where did Vasudev leave baby Krishna for safety?", options: ["Gokul", "Mathura", "Vrindavan", "Dwaraka"], correctIndex: 0 },
    hi: { question: "वसुदेव ने सुरक्षा के लिए शिशु कृष्ण को कहाँ छोड़ा?", options: ["गोकुल", "मथुरा", "वृंदावन", "द्वारका"], correctIndex: 0 },
    mr: { question: "सुरक्षेसाठी वसुदेवांनी बालकृष्णला कुठे सोडले?", options: ["गोकुल", "मथुरा", "वृंदावन", "द्वारका"], correctIndex: 0 },
    te: { question: "వసుదేవుడు శిశు కృష్ణుడిని భద్రత కోసం ఎక్కడ వదిలాడు?", options: ["గోకులం", "మథుర", "వృందావనం", "ద్వారక"], correctIndex: 0 },
    ta: { question: "வசுதேவர் குழந்தை கிருஷ்ணரை பாதுகாப்பிற்காக எங்கே விட்டார்?", options: ["கோகுலம்", "மதுரா", "விருந்தாவனம்", "துவாரகை"], correctIndex: 0 },
    kn: { question: "ವಸುದೇವರು ಬಾಲಕೃಷ್ಣನನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಎಲ್ಲಿ ಬಿಟ್ಟರು?", options: ["ಗೋಕುಲ", "ಮಥುರಾ", "ವೃಂದಾವನ", "ದ್ವಾರಕ"], correctIndex: 0 },
  },
  // Q6
  {
    en: { question: "Who subdued the venomous serpent by dancing on its hoods?", options: ["Balarama", "Krishna", "Arjuna", "Garuda"], correctIndex: 1 },
    hi: { question: "विषैले सर्प को उसके फणों पर नाचकर किसने वश में किया?", options: ["बलराम", "कृष्ण", "अर्जुन", "गरुड़"], correctIndex: 1 },
    mr: { question: "विषारी सर्पाला त्याच्या फणांवर नाचून कोणी वश केले?", options: ["बलराम", "कृष्ण", "अर्जुन", "गरुड"], correctIndex: 1 },
    te: { question: "విషపూరిత సర్పాన్ని దాని పడగలపై నృత్యం చేసి ఎవరు లొంగదీసుకున్నారు?", options: ["బలరామ", "కృష్ణ", "అర్జున", "గరుడ"], correctIndex: 1 },
    ta: { question: "விஷப் பாம்பை அதன் படங்கள் மீது நடனமாடி யார் அடக்கினார்?", options: ["பலராமர்", "கிருஷ்ணர்", "அர்ஜுனர்", "கருடன்"], correctIndex: 1 },
    kn: { question: "ವಿಷಪೂರಿತ ನಾಗವನ್ನು ಅದರ ಹೆಡೆಗಳ ಮೇಲೆ ನರ್ತಿಸಿ ಯಾರು ನಿಗ್ರಹಿಸಿದರು?", options: ["ಬಲರಾಮ", "ಕೃಷ್ಣ", "ಅರ್ಜುನ", "ಗರುಡ"], correctIndex: 1 },
  },
  // Q7
  {
    en: { question: "What did young Krishna lift with one finger to shelter villagers from Indra's rain?", options: ["A mountain", "A tree", "A chariot", "A boulder"], correctIndex: 0 },
    hi: { question: "इंद्र की वर्षा से ग्रामीणों को बचाने के लिए युवा कृष्ण ने एक उंगली से क्या उठाया?", options: ["पर्वत", "वृक्ष", "रथ", "चट्टान"], correctIndex: 0 },
    mr: { question: "इंद्राच्या पावसापासून ग्रामिकांना वाचवण्यासाठी कृष्णाने एका बोटाने काय उचलले?", options: ["पर्वत", "वृक्ष", "रथ", "चट्टान"], correctIndex: 0 },
    te: { question: "ఇంద్రుని వర్షం నుండి గ్రామస్థులను రక్షించడానికి బాల కృష్ణుడు ఒక వేలితో ఏమి ఎత్తాడు?", options: ["పర్వతం", "వృక్షం", "రథం", "బండరాయి"], correctIndex: 0 },
    ta: { question: "இந்திரன் மழையிலிருந்து கிராமவாசிகளைக் காக்க கிருஷ்ணர் ஒரு விரலால் எதைத் தூக்கினார்?", options: ["மலை", "மரம்", "ரதம்", "பாறை"], correctIndex: 0 },
    kn: { question: "ಇಂದ್ರನ ಮಳೆಯಿಂದ ಗ್ರಾಮಸ್ಥರನ್ನು ರಕ್ಷಿಸಲು ಬಾಲಕೃಷ್ಣ ಒಂದು ಬೆರಳಿಂದ ಏನು ಎತ್ತಿದರು?", options: ["ಪರ್ವತ", "ಮರ", "ರಥ", "ಬಂಡೆ"], correctIndex: 0 },
  },
  // Q8
  {
    en: { question: "What did young Krishna love to steal from the gopis' homes?", options: ["Flowers", "Butter", "Jewels", "Clothes"], correctIndex: 1 },
    hi: { question: "युवा कृष्ण गोपियों के घरों से क्या चुराना पसंद करते थे?", options: ["फूल", "मक्खन", "आभूषण", "कपड़े"], correctIndex: 1 },
    mr: { question: "कृष्णाला गोपिकांच्या घरातून काय चोरण्याची आवड होती?", options: ["फुले", "लोणी", "भूषणे", "कपडे"], correctIndex: 1 },
    te: { question: "బాల కృష్ణుడు గోపికల ఇళ్ల నుండి ఏమి దొంగిలించడం ఇష్టపడేవాడు?", options: ["పువ్వులు", "వెన్న", "ఆభరణాలు", "బట్టలు"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணர் கோபியர் வீடுகளில் இருந்து எதைத் திருட விரும்பினார்?", options: ["மலர்கள்", "வெண்ணெய்", "நகைகள்", "ஆடைகள்"], correctIndex: 1 },
    kn: { question: "ಬಾಲಕೃಷ್ಣ ಗೋಪಿಕೆಯರ ಮನೆಗಳಿಂದ ಏನು ಕದಿಯಲು ಇಷ್ಟಪಡುತ್ತಿದ್ದರು?", options: ["ಹೂವುಗಳು", "ಬೆಣ್ಣೆ", "ಆಭರಣ", "ಬಟ್ಟೆಗಳು"], correctIndex: 1 },
  },
  // Q9
  {
    en: { question: "Traditionally, how many cows did Krishna tend in Vrindavan?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
    hi: { question: "परंपरा के अनुसार वृंदावन में कृष्ण कितनी गायों की देखभाल करते थे?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
    mr: { question: "परंपरेनुसार कृष्ण वृंदावनात किती गायींची काळजी घेत असे?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
    te: { question: "సంప్రదాయం ప్రకారం వృందావనంలో కృష్ణుడు ఎన్ని ఆవులను కాచేవాడు?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
    ta: { question: "மரபின்படி விருந்தாவனத்தில் கிருஷ்ணர் எத்தனை பசுக்களை மேய்த்தார்?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
    kn: { question: "ಸಂಪ್ರದಾಯದ ಪ್ರಕಾರ ವೃಂದಾವನದಲ್ಲಿ ಕೃಷ್ಣ ಎಷ್ಟು ಹಸುಗಳನ್ನು ಕಾಯುತ್ತಿದ್ದರು?", options: ["5", "500", "1000", "5000"], correctIndex: 3 },
  },
  // Q10
  {
    en: { question: "Which demoness tried to poison baby Krishna with her breast milk?", options: ["Kansa", "Putana", "Bakasura", "Trinavarta"], correctIndex: 1 },
    hi: { question: "किस राक्षसी ने अपने स्तन के दूध से शिशु कृष्ण को विष देने की कोशिश की?", options: ["कंस", "पूतना", "बकासुर", "त्रिनवर्ता"], correctIndex: 1 },
    mr: { question: "कोणत्या राक्षसीने आपल्या स्तनदुधातून बालकृष्णाला विष देण्याचा प्रयत्न केला?", options: ["कंस", "पूतना", "बकासुर", "त्रिनवर्ता"], correctIndex: 1 },
    te: { question: "ఏ రాక్షసి తన చనుబాలతో శిశు కృష్ణునికి విషం ఇవ్వడానికి ప్రయత్నించింది?", options: ["కంస", "పూతన", "బకాసుర", "త్రినవర్త"], correctIndex: 1 },
    ta: { question: "எந்த அரக்கி தன் தாய்ப்பால் மூலம் குழந்தை கிருஷ்ணருக்கு விஷம் கொடுக்க முயன்றாள்?", options: ["கம்சன்", "பூதனா", "பகாசுரன்", "திரிநவர்த்தன்"], correctIndex: 1 },
    kn: { question: "ಯಾವ ರಾಕ್ಷಸಿ ತನ್ನ ಎದೆಯ ಹಾಲಿನಿಂದ ಬಾಲಕೃಷ್ಣನಿಗೆ ವಿಷ ನೀಡಲು ಪ್ರಯತ್ನಿಸಿದಳು?", options: ["ಕಂಸ", "ಪೂತನ", "ಬಕಾಸುರ", "ತ್ರಿನವರ್ತ"], correctIndex: 1 },
  },
  // Q11
  {
    en: { question: "What did Krishna lift for seven days to protect Vrindavan from Indra's storm?", options: ["Nagphani mountain", "Mount Govardhan", "Himalaya peak", "Vindhya range"], correctIndex: 1 },
    hi: { question: "इंद्र की आंधी से वृंदावन को बचाने के लिए कृष्ण ने सात दिन क्या उठाए रखा?", options: ["नागफनी पर्वत", "गोवर्धन पर्वत", "हिमालय शिखर", "विंध्य पर्वत"], correctIndex: 1 },
    mr: { question: "इंद्राच्या वादळापासून वृंदावन वाचवण्यासाठी कृष्णाने सात दिवस काय उचलून धरले?", options: ["नागफणी पर्वत", "गोवर्धन गिरी", "हिमालय शिखर", "विंध्य पर्वत"], correctIndex: 1 },
    te: { question: "ఇంద్రుని తుఫాను నుండి వృందావనాన్ని రక్షించడానికి కృష్ణుడు ఏడు రోజులు ఏమి ఎత్తిపట్టాడు?", options: ["నాగఫణి పర్వతం", "గోవర్ధన పర్వతం", "హిమాలయ శిఖరం", "వింధ్య శ్రేణి"], correctIndex: 1 },
    ta: { question: "இந்திரன் புயலிலிருந்து விருந்தாவனத்தைக் காக்க கிருஷ்ணர் ஏழு நாட்கள் எதைத் தூக்கிச் சுமந்தார்?", options: ["நாக்பானி மலை", "கோவர்தன மலை", "இமய உச்சி", "விந்திய மலை"], correctIndex: 1 },
    kn: { question: "ಇಂದ್ರನ ಚಂಡಮಾರುತದಿಂದ ವೃಂದಾವನವನ್ನು ರಕ್ಷಿಸಲು ಕೃಷ್ಣ ಏಳು ದಿನ ಏನು ಎತ್ತಿಹಿಡಿದರು?", options: ["ನಾಗಫಣಿ ಬೆಟ್ಟ", "ಗೋವರ್ಧನ ಬೆಟ್ಟ", "ಹಿಮಾಲಯ ಶಿಖರ", "ವಿಂಧ್ಯ ಪರ್ವತ"], correctIndex: 1 },
  },
  // Q12
  {
    en: { question: "What does 'Govinda,' one of young Krishna's names, mean?", options: ["Protector of cows", "King of Mathura", "Blue one", "Flute player"], correctIndex: 0 },
    hi: { question: "युवा कृष्ण के नाम 'गोविंदा' का क्या अर्थ है?", options: ["गायों का रक्षक", "मथुरा का राजा", "नीला व्यक्ति", "बांसुरी बजाने वाला"], correctIndex: 0 },
    mr: { question: "कृष्णाच्या नाव 'गोविंदा' याचा अर्थ काय आहे?", options: ["गायांचा रक्षक", "मथुरेचा राजा", "निळ्यारंगाचा", "वादळी वाजवणारा"], correctIndex: 0 },
    te: { question: "బాల కృష్ణుని పేరు 'గోవింద' అంటే ఏమిటి?", options: ["ఆవుల రక్షకుడు", "మథుర రాజు", "నీలిరంగు వ్యక్తి", "వేణువు వాయించువాడు"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணரின் பெயர் 'கோவிந்தா' என்பதன் பொருள் என்ன?", options: ["பசுக்களின் காவலன்", "மதுரா மன்னன்", "நீல நிறமானவன்", "குழல் வாசிப்பவன்"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣನ ಹೆಸರು 'ಗೋವಿಂದ' ಎಂಬುದರ ಅರ್ಥವೇನು?", options: ["ಹಸುಗಳ ರಕ್ಷಕ", "ಮಥುರಾ ರಾಜ", "ನೀಲಿ ಬಣ್ಣದವನು", "ಕೊಳಲು ವಾದಕ"], correctIndex: 0 },
  },
  // Q13
  {
    en: { question: "Who hid the gopis' clothes while they bathed in the river?", options: ["Krishna", "Yashoda", "Kansa", "Devaki"], correctIndex: 0 },
    hi: { question: "नदी में स्नान करते समय गोपियों के कपड़े किसने छिपाए?", options: ["कृष्ण", "यशोदा", "कंस", "देवकी"], correctIndex: 0 },
    mr: { question: "नदीत स्नान करताना गोपिकांचे कपडे कोणी लपवले?", options: ["कृष्ण", "यशोदा", "कंस", "देवकी"], correctIndex: 0 },
    te: { question: "నదిలో స్నానం చేస్తున్నప్పుడు గోపికల బట్టలు ఎవరు దాచారు?", options: ["కృష్ణ", "యశోద", "కంస", "దేవకి"], correctIndex: 0 },
    ta: { question: "நதியில் நீராடும்போது கோபிகளின் ஆடைகளை யார் மறைத்தார்?", options: ["கிருஷ்ணர்", "யசோதா", "கம்சன்", "தேவகி"], correctIndex: 0 },
    kn: { question: "ನದಿಯಲ್ಲಿ ಸ್ನಾನ ಮಾಡುತ್ತಿದ್ದಾಗ ಗೋಪಿಕೆಯರ ಬಟ್ಟೆಗಳನ್ನು ಯಾರು ಅಡಗಿಸಿದರು?", options: ["ಕೃಷ್ಣ", "ಯಶೋದ", "ಕಂಸ", "ದೇವಕಿ"], correctIndex: 0 },
  },
  // Q14
  {
    en: { question: "What was Krishna's beloved childhood butter made from?", options: ["Cow milk", "Buffalo milk", "Goat milk", "Yak milk"], correctIndex: 0 },
    hi: { question: "कृष्ण का प्रिय बचपन का मक्खन किसका बना होता था?", options: ["गाय का दूध", "भैंस का दूध", "बकरी का दूध", "याक का दूध"], correctIndex: 0 },
    mr: { question: "कृष्णाला प्रिय असणारे लोणी कुठल्या दुधाचे होते?", options: ["गायीचे दूध", "म्हैसीचे दूध", "शेळीचे दूध", "याकचे दूध"], correctIndex: 0 },
    te: { question: "కృష్ణునికి ఇష్టమైన వెన్న ఏ పాల నుండి తయారవుతుంది?", options: ["ఆవు పాలు", "గేదె పాలు", "మేక పాలు", "యాక్ పాలు"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணரின் விருப்பமான வெண்ணெய் எந்தப் பாலில் செய்யப்பட்டது?", options: ["பசும்பால்", "எருமைப் பால்", "ஆட்டுப்பால்", "யாக் பால்"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣನಿಗೆ ಪ್ರಿಯವಾದ ಬೆಣ್ಣೆ ಯಾವ ಹಾಲಿನದಾಗಿತ್ತು?", options: ["ಹಸುವಿನ ಹಾಲು", "ಎಮ್ಮೆಯ ಹಾಲು", "ಮೇಕೆಯ ಹಾಲು", "ಯಾಕ್ ಹಾಲು"], correctIndex: 0 },
  },
  // Q15
  {
    en: { question: "What happened when young Krishna played his flute in Vrindavan?", options: ["Rivers dried up", "Gopis came dancing", "Cows ran away", "Flowers wilted"], correctIndex: 1 },
    hi: { question: "वृंदावन में जब कृष्ण बांसुरी बजाते थे तो क्या होता था?", options: ["नदियाँ सूख जातीं", "गोपियाँ नाचने आ जातीं", "गायें भाग जातीं", "फूल मुरझा जाते"], correctIndex: 1 },
    mr: { question: "वृंदावनात कृष्ण वादळी वाजवत असे तेव्हा काय होत असे?", options: ["नद्या कोरड्या होत", "गोपिका नाचत येत", "गाया भागत", "फुले वाळत"], correctIndex: 1 },
    te: { question: "వృందావనంలో బాల కృష్ణుడు వేణువు వాయించినప్పుడు ఏమి జరిగేది?", options: ["నదులు ఎండిపోయేవి", "గోపికలు నాట్యం చేస్తూ వచ్చేవారు", "ఆవులు పారిపోయేవి", "పూలు వాడిపోయేవి"], correctIndex: 1 },
    ta: { question: "விருந்தாவனத்தில் கிருஷ்ணர் குழல் வாசிக்கும்போது என்ன நடந்தது?", options: ["ஆறுகள் வறண்டன", "கோபிகள் நடனமாடி வந்தனர்", "பசுக்கள் ஓடின", "மலர்கள் வாடின"], correctIndex: 1 },
    kn: { question: "ವೃಂದಾವನದಲ್ಲಿ ಕೃಷ್ಣ ಕೊಳಲು ನುಡಿಸುತ್ತಿದ್ದಾಗ ಏನಾಗುತ್ತಿತ್ತು?", options: ["ನದಿಗಳು ಒಣಗುತ್ತಿದ್ದವು", "ಗೋಪಿಕೆಯರು ನರ್ತಿಸುತ್ತಾ ಬರುತ್ತಿದ್ದರು", "ಹಸುಗಳು ಓಡುತ್ತಿದ್ದವು", "ಹೂವುಗಳು ಒಣಗುತ್ತಿದ್ದವು"], correctIndex: 1 },
  },
  // Q16
  {
    en: { question: "Which demon disguised himself as a giant python to swallow Krishna and his friends?", options: ["Aghasura", "Bakasura", "Dhenukasura", "Vatsasura"], correctIndex: 0 },
    hi: { question: "कृष्ण और उसके मित्रों को निगलने के लिए किस राक्षस ने विशाल अजगर का रूप धारण किया?", options: ["अघासुर", "बकासुर", "धेनुकासुर", "वत्सासुर"], correctIndex: 0 },
    mr: { question: "कृष्ण आणि त्याच्या मित्रांना गिळण्यासाठी कोणत्या राक्षसाने विशाल अजगराचे रूप घेतले?", options: ["अघासुर", "बकासुर", "धेनुकासुर", "वत्सासुर"], correctIndex: 0 },
    te: { question: "కృష్ణుడిని మరియు అతని స్నేహితులను మింగడానికి ఏ రాక్షసుడు బ్రహ్మాండమైన కొండచిలువ రూపం ధరించాడు?", options: ["అఘాసుర", "బకాసుర", "ధేనుకాసుర", "వత్సాసుర"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணரையும் நண்பர்களையும் விழுங்க எந்த அரக்கன் பெரிய மலைப்பாம்பு வடிவம் எடுத்தான்?", options: ["அகாசுரன்", "பகாசுரன்", "தேனுகாசுரன்", "வத்சாசுரன்"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣ ಮತ್ತು ಸ್ನೇಹಿತರನ್ನು ನುಂಗಲು ಯಾವ ರಾಕ್ಷಸ ಬೃಹತ್ ಹೆಬ್ಬಾವಿನ ರೂಪ ಧರಿಸಿದರು?", options: ["ಅಘಾಸುರ", "ಬಕಾಸುರ", "ಧೇನುಕಾಸುರ", "ವತ್ಸಾಸುರ"], correctIndex: 0 },
  },
  // Q17
  {
    en: { question: "Which demon took the form of a donkey guarding a forbidden fruit orchard?", options: ["Bakasura", "Trinavarta", "Dhenukasura", "Vyomasura"], correctIndex: 2 },
    hi: { question: "निषिद्ध फलों के बगीचे की रखवाली करने वाले गधे का रूप किस राक्षस ने लिया?", options: ["बकासुर", "त्रिनवर्ता", "धेनुकासुर", "व्योमासुर"], correctIndex: 2 },
    mr: { question: "निषिद्ध फळांच्या बागेची रखवाली करणाऱ्या गाढवाचे रूप कोणत्या राक्षसाने घेतले?", options: ["बकासुर", "त्रिनवर्ता", "धेनुकासुर", "व्योमासुर"], correctIndex: 2 },
    te: { question: "నిషిద్ధ పండ్ల తోటను కాపాడే గాడిద రూపం ఏ రాక్షసుడు ధరించాడు?", options: ["బకాసుర", "త్రినవర్త", "ధేనుకాసుర", "వ్యోమాసుర"], correctIndex: 2 },
    ta: { question: "தடைசெய்யப்பட்ட பழத்தோட்டத்தைக் காக்கும் கழுதை வடிவம் எடுத்த அரக்கன் யார்?", options: ["பகாசுரன்", "திரிநவர்த்தன்", "தேனுகாசுரன்", "வ்யோமாசுரன்"], correctIndex: 2 },
    kn: { question: "ನಿಷಿದ್ಧ ಹಣ್ಣುಗಳ ತೋಟವನ್ನು ಕಾಯುವ ಕತ್ತೆಯ ರೂಪ ಯಾವ ರಾಕ್ಷಸ ಧರಿಸಿದರು?", options: ["ಬಕಾಸುರ", "ತ್ರಿನವರ್ತ", "ಧೇನುಕಾಸುರ", "ವ್ಯೋಮಾಸುರ"], correctIndex: 2 },
  },
  // Q18
  {
    en: { question: "Which demon took the form of a giant crane to attack young Krishna?", options: ["Aghasura", "Bakasura", "Keshi", "Vatsasura"], correctIndex: 1 },
    hi: { question: "युवा कृष्ण पर हमला करने के लिए किस राक्षस ने विशाल सारस का रूप लिया?", options: ["अघासुर", "बकासुर", "केशी", "वत्सासुर"], correctIndex: 1 },
    mr: { question: "कृष्णावर हल्ला करण्यासाठी कोणत्या राक्षसाने विशाल बगळ्याचे रूप घेतले?", options: ["अघासुर", "बकासुर", "केशी", "वत्सासुर"], correctIndex: 1 },
    te: { question: "బాల కృష్ణునిపై దాడి చేయడానికి ఏ రాక్షసుడు బ్రహ్మాండమైన కొంగ రూపం ధరించాడు?", options: ["అఘాసుర", "బకాసుర", "కేశి", "వత్సాసుర"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணரைத் தாக்க எந்த அரக்கன் பெரிய கொக்கு வடிவம் எடுத்தான்?", options: ["அகாசுரன்", "பகாசுரன்", "கேசி", "வத்சாசுரன்"], correctIndex: 1 },
    kn: { question: "ಬಾಲಕೃಷ್ಣನ ಮೇಲೆ ದಾಳಿ ಮಾಡಲು ಯಾವ ರಾಕ್ಷಸ ಬೃಹತ್ ಕೊಕ್ಕರೆಯ ರೂಪ ಧರಿಸಿದರು?", options: ["ಅಘಾಸುರ", "ಬಕಾಸುರ", "ಕೇಶಿ", "ವತ್ಸಾಸುರ"], correctIndex: 1 },
  },
  // Q19
  {
    en: { question: "Which demon took the form of a whirlwind to try to carry baby Krishna away?", options: ["Keshi", "Shakatasura", "Vyomasura", "Trinavarta"], correctIndex: 3 },
    hi: { question: "शिशु कृष्ण को उड़ा ले जाने के लिए किस राक्षस ने बवंडर का रूप धारण किया?", options: ["केशी", "शकटासुर", "व्योमासुर", "त्रिनवर्ता"], correctIndex: 3 },
    mr: { question: "बालकृष्णाला उचलून नेण्यासाठी कोणत्या राक्षसाने वावटळीचे रूप घेतले?", options: ["केशी", "शकटासुर", "व्योमासुर", "त्रिनवर्ता"], correctIndex: 3 },
    te: { question: "శిశు కృష్ణుని ఎత్తుకుపోవడానికి ఏ రాక్షసుడు సుడిగాలి రూపం ధరించాడు?", options: ["కేశి", "శకటాసుర", "వ్యోమాసుర", "త్రినవర్త"], correctIndex: 3 },
    ta: { question: "குழந்தை கிருஷ்ணரைத் தூக்கிச்செல்ல எந்த அரக்கன் சுழற்காற்று வடிவம் எடுத்தான்?", options: ["கேசி", "சகடாசுரன்", "வ்யோமாசுரன்", "திரிநவர்த்தன்"], correctIndex: 3 },
    kn: { question: "ಬಾಲಕೃಷ್ಣನನ್ನು ಎತ್ತಿಕೊಂಡು ಹೋಗಲು ಯಾವ ರಾಕ್ಷಸ ಸುಳಿಗಾಳಿಯ ರೂಪ ಧರಿಸಿದರು?", options: ["ಕೇಶಿ", "ಶಕಟಾಸುರ", "ವ್ಯೋಮಾಸುರ", "ತ್ರಿನವರ್ತ"], correctIndex: 3 },
  },
  // Q20
  {
    en: { question: "Which demon possessed a cart in an attempt to crush baby Krishna?", options: ["Shakatasura", "Vatsasura", "Pralambasura", "Bakasura"], correctIndex: 0 },
    hi: { question: "शिशु कृष्ण को कुचलने के लिए किस राक्षस ने गाड़ी में प्रवेश किया?", options: ["शकटासुर", "वत्सासुर", "प्रलम्बासुर", "बकासुर"], correctIndex: 0 },
    mr: { question: "बालकृष्णाला चिरडण्यासाठी कोणत्या राक्षसाने गाडीत प्रवेश केला?", options: ["शकटासुर", "वत्सासुर", "प्रलंबासुर", "बकासुर"], correctIndex: 0 },
    te: { question: "శిశు కృష్ణుని నలిపేయడానికి ఏ రాక్షసుడు బండిలో ప్రవేశించాడు?", options: ["శకటాసుర", "వత్సాసుర", "ప్రలంబాసుర", "బకాసుర"], correctIndex: 0 },
    ta: { question: "குழந்தை கிருஷ்ணரை நசுக்க எந்த அரக்கன் வண்டியில் புகுந்தான்?", options: ["சகடாசுரன்", "வத்சாசுரன்", "பிரலம்பாசுரன்", "பகாசுரன்"], correctIndex: 0 },
    kn: { question: "ಬಾಲಕೃಷ್ಣನನ್ನು ನುಜ್ಜುಗುಜ್ಜು ಮಾಡಲು ಯಾವ ರಾಕ್ಷಸ ಬಂಡಿಯಲ್ಲಿ ಪ್ರವೇಶಿಸಿದರು?", options: ["ಶಕಟಾಸುರ", "ವತ್ಸಾಸುರ", "ಪ್ರಲಂಬಾಸುರ", "ಬಕಾಸುರ"], correctIndex: 0 },
  },
  // Q21
  {
    en: { question: "Who killed the tyrant Kansa, marking the end of his childhood in Vrindavan?", options: ["Arjuna", "Bheema", "Krishna", "Balarama"], correctIndex: 2 },
    hi: { question: "अत्याचारी कंस को किसने मारा, जिससे वृंदावन में उसका बचपन समाप्त हुआ?", options: ["अर्जुन", "भीम", "कृष्ण", "बलराम"], correctIndex: 2 },
    mr: { question: "जुल्मी कंसाला कोणा मारले, ज्यामुळे वृंदावनातील त्याचे बालपण संपले?", options: ["अर्जुन", "भीम", "कृष्ण", "बलराम"], correctIndex: 2 },
    te: { question: "నిరంకుశుడైన కంసుడిని ఎవరు చంపారు, దీంతో వృందావనంలో అతని బాల్యం ముగిసింది?", options: ["అర్జున", "భీమ", "కృష్ణ", "బలరామ"], correctIndex: 2 },
    ta: { question: "கொடுங்கோலன் கம்சனை யார் கொன்றார், இதனால் விருந்தாவனத்தில் அவர் குழந்தைப்பருவம் முடிந்தது?", options: ["அர்ஜுனன்", "பீமன்", "கிருஷ்ணன்", "பலராமன்"], correctIndex: 2 },
    kn: { question: "ದುರಹಂಕಾರಿ ಕಂಸನನ್ನು ಯಾರು ಕೊಂದರು, ಇದರಿಂದ ವೃಂದಾವನದಲ್ಲಿನ ಅವರ ಬಾಲ್ಯ ಮುಗಿಯಿತು?", options: ["ಅರ್ಜುನ", "ಭೀಮ", "ಕೃಷ್ಣ", "ಬಲರಾಮ"], correctIndex: 2 },
  },
  // Q22
  {
    en: { question: "Who was Krishna and Balarama's teacher after leaving Vrindavan?", options: ["Dronacharya", "Sandipani", "Vashishtha", "Parashurama"], correctIndex: 1 },
    hi: { question: "वृंदावन छोड़ने के बाद कृष्ण और बलराम के गुरु कौन थे?", options: ["द्रोणाचार्य", "सांदीपनि", "वशिष्ठ", "परशुराम"], correctIndex: 1 },
    mr: { question: "वृंदावन सोडल्यानंतर कृष्ण आणि बलरामाचे गुरु कोण होते?", options: ["द्रोणाचार्य", "सांदीपनि", "वशिष्ठ", "परशुराम"], correctIndex: 1 },
    te: { question: "వృందావనం వదిలిన తర్వాత కృష్ణ, బలరాముల గురువు ఎవరు?", options: ["ద్రోణాచార్య", "సాందీపని", "వశిష్ఠ", "పరశురామ"], correctIndex: 1 },
    ta: { question: "விருந்தாவனத்தை விட்டு பின் கிருஷ்ணருக்கும் பலராமருக்கும் ஆசான் யார்?", options: ["துரோணாச்சாரியார்", "சாந்தீபனி", "வசிஷ்டர்", "பரசுராமர்"], correctIndex: 1 },
    kn: { question: "ವೃಂದಾವನವನ್ನು ಬಿಟ್ಟ ನಂತರ ಕೃಷ್ಣ ಮತ್ತು ಬಲರಾಮರ ಗುರು ಯಾರು?", options: ["ದ್ರೋಣಾಚಾರ್ಯ", "ಸಾಂದೀಪನಿ", "ವಸಿಷ್ಠ", "ಪರಶುರಾಮ"], correctIndex: 1 },
  },
  // Q23
  {
    en: { question: "Who was Krishna's beloved companion during his years in Vrindavan?", options: ["Satyabhama", "Rukmini", "Radha", "Jambavati"], correctIndex: 2 },
    hi: { question: "वृंदावन के वर्षों में कृष्ण की प्रिय साथी कौन थीं?", options: ["सत्यभामा", "रुक्मिणी", "राधा", "जांबवती"], correctIndex: 2 },
    mr: { question: "वृंदावनातील वर्षांमध्ये कृष्णाची प्रिय साथीण कोण होती?", options: ["सत्यभामा", "रुक्मिणी", "राधा", "जांबवती"], correctIndex: 2 },
    te: { question: "వృందావన సంవత్సరాలలో కృష్ణుని ప్రియ సహచరి ఎవరు?", options: ["సత్యభామ", "రుక్మిణి", "రాధ", "జాంబవతి"], correctIndex: 2 },
    ta: { question: "விருந்தாவனத்தில் இருந்த ஆண்டுகளில் கிருஷ்ணரின் அன்புத் துணை யார்?", options: ["சத்யபாமா", "ருக்மிணி", "ராதா", "ஜாம்பவதி"], correctIndex: 2 },
    kn: { question: "ವೃಂದಾವನದ ವರ್ಷಗಳಲ್ಲಿ ಕೃಷ್ಣನ ಪ್ರಿಯ ಸಂಗಾತಿ ಯಾರು?", options: ["ಸತ್ಯಭಾಮಾ", "ರುಕ್ಮಿಣಿ", "ರಾಧಾ", "ಜಾಂಬವತಿ"], correctIndex: 2 },
  },
  // Q24
  {
    en: { question: "How did young Krishna kill the horse-demon Keshi, sent by Kansa?", options: ["With a sword", "With his fist", "With his foot", "With his chakra"], correctIndex: 1 },
    hi: { question: "कंस द्वारा भेजे गए घोड़ा-राक्षस केशी को कृष्ण ने कैसे मारा?", options: ["तलवार से", "मुक्के से", "पैर से", "चक्र से"], correctIndex: 1 },
    mr: { question: "कंसाने पाठवलेला घोडा-राक्षस केशी कृष्णाने कसा मारला?", options: ["तलवारीने", "मुक्क्याने", "पायाने", "चक्राने"], correctIndex: 1 },
    te: { question: "కంసుడు పంపిన గుర్రపు రాక్షసుడు కేశిని కృష్ణుడు ఎలా చంపాడు?", options: ["కత్తితో", "పిడికిలితో", "పాదంతో", "చక్రంతో"], correctIndex: 1 },
    ta: { question: "கம்சன் அனுப்பிய குதிரை அரக்கன் கேசியை கிருஷ்ணர் எப்படிக் கொன்றார்?", options: ["வாளால்", "முஷ்டியால்", "பாதத்தால்", "சக்கரத்தால்"], correctIndex: 1 },
    kn: { question: "ಕಂಸ ಕಳುಹಿಸಿದ ಕುದುರೆ ರಾಕ್ಷಸ ಕೇಶಿಯನ್ನು ಕೃಷ್ಣ ಹೇಗೆ ಕೊಂದರು?", options: ["ಖಡ್ಗದಿಂದ", "ಮುಷ್ಠಿಯಿಂದ", "ಪಾದದಿಂದ", "ಚಕ್ರದಿಂದ"], correctIndex: 1 },
  },
  // Q25
  {
    en: { question: "What is Krishna's peacock feather, worn since his youth, traditionally a symbol of?", options: ["Beauty", "Love", "Victory", "Dance"], correctIndex: 2 },
    hi: { question: "युवावस्था से धारण किया जाने वाला कृष्ण का मोर पंख परंपरागत रूप से किसका प्रतीक है?", options: ["सौंदर्य", "प्रेम", "विजय", "नृत्य"], correctIndex: 2 },
    mr: { question: "कृष्णाने लहानपणापासून धारण केलेला मोरपंख पारंपारिकरित्या कशाचे प्रतीक आहे?", options: ["सौंदर्य", "प्रेम", "विजय", "नृत्य"], correctIndex: 2 },
    te: { question: "యవ్వనం నుండి ధరించే కృష్ణుని నెమలి ఈక సాంప్రదాయకంగా దేనికి ప్రతీక?", options: ["అందం", "ప్రేమ", "విజయం", "నృత్యం"], correctIndex: 2 },
    ta: { question: "இளமையிலிருந்து அணியும் கிருஷ்ணரின் மயில் இறகு மரபுப்படி எதன் அடையாளம்?", options: ["அழகு", "காதல்", "வெற்றி", "நடனம்"], correctIndex: 2 },
    kn: { question: "ಬಾಲ್ಯದಿಂದಲೂ ಧರಿಸುವ ಕೃಷ್ಣನ ನವಿಲ ಗರಿ ಸಾಂಪ್ರದಾಯಿಕವಾಗಿ ಯಾವುದರ ಸಂಕೇತ?", options: ["ಸೌಂದರ್ಯ", "ಪ್ರೀತಿ", "ಜಯ", "ನೃತ್ಯ"], correctIndex: 2 },
  },

  // ===== PART 2: KRISHNA'S ADULTHOOD =====
  // Q26
  {
    en: { question: "What is Krishna's city, founded after leaving Mathura?", options: ["Ayodhya", "Dwaraka", "Lanka", "Indraprastha"], correctIndex: 1 },
    hi: { question: "मथुरा छोड़ने के बाद स्थापित कृष्ण की नगरी कौन सी है?", options: ["अयोध्या", "द्वारका", "लंका", "इंद्रप्रस्थ"], correctIndex: 1 },
    mr: { question: "मथुरा सोडल्यानंतर स्थापन झालेली कृष्णाची नगरी कोणती?", options: ["अयोध्या", "द्वारका", "लंका", "इंद्रप्रस्थ"], correctIndex: 1 },
    te: { question: "మథురను వదిలిన తర్వాత కృష్ణుడు స్థాపించిన నగరం ఏది?", options: ["అయోధ్య", "ద్వారక", "లంక", "ఇంద్రప్రస్థ"], correctIndex: 1 },
    ta: { question: "மதுராவை விட்ட பின் கிருஷ்ணர் நிறுவிய நகரம் எது?", options: ["அயோத்தி", "துவாரகை", "இலங்கை", "இந்திரப்பிரஸ்தம்"], correctIndex: 1 },
    kn: { question: "ಮಥುರಾವನ್ನು ಬಿಟ್ಟ ನಂತರ ಕೃಷ್ಣ ಸ್ಥಾಪಿಸಿದ ನಗರ ಯಾವುದು?", options: ["ಅಯೋಧ್ಯೆ", "ದ್ವಾರಕೆ", "ಲಂಕೆ", "ಇಂದ್ರಪ್ರಸ್ಥ"], correctIndex: 1 },
  },
  // Q27
  {
    en: { question: "In which war did Krishna serve as Arjuna's charioteer?", options: ["Kurukshetra", "Panipat", "Plassey", "Haldighati"], correctIndex: 0 },
    hi: { question: "किस युद्ध में कृष्ण ने अर्जुन के सारथी के रूप में कार्य किया?", options: ["कुरुक्षेत्र", "पानीपत", "प्लासी", "हल्दीघाटी"], correctIndex: 0 },
    mr: { question: "कोणत्या युद्धात कृष्णाने अर्जुनाचा सारथी म्हणून काम केले?", options: ["कुरुक्षेत्र", "पानिपत", "प्लासी", "हल्दीघाटी"], correctIndex: 0 },
    te: { question: "ఏ యుద్ధంలో కృష్ణుడు అర్జునుని సారథిగా పనిచేశాడు?", options: ["కురుక్షేత్ర", "పానిపట్", "ప్లాసీ", "హల్దిఘాటి"], correctIndex: 0 },
    ta: { question: "எந்தப் போரில் கிருஷ்ணர் அர்ஜுனனுக்கு தேரோட்டியாக இருந்தார்?", options: ["குருக்ஷேத்திரம்", "பானிபட்", "பிளாசி", "ஹல்திகாட்டி"], correctIndex: 0 },
    kn: { question: "ಯಾವ ಯುದ್ಧದಲ್ಲಿ ಕೃಷ್ಣ ಅರ್ಜುನನ ಸಾರಥಿಯಾಗಿ ಸೇವೆ ಸಲ್ಲಿಸಿದರು?", options: ["ಕುರುಕ್ಷೇತ್ರ", "ಪಾನಿಪತ್", "ಪ್ಲಾಸಿ", "ಹಲ್ದಿಘಾಟಿ"], correctIndex: 0 },
  },
  // Q28
  {
    en: { question: "What was the name of Krishna's own personal charioteer?", options: ["Daruka", "Sanjaya", "Aruna", "Matali"], correctIndex: 0 },
    hi: { question: "कृष्ण के अपने निजी सारथी का क्या नाम था?", options: ["दारुक", "संजय", "अरुण", "मातलि"], correctIndex: 0 },
    mr: { question: "कृष्णाच्या स्वतःच्या सारथीचे काय नाव होते?", options: ["दारुक", "संजय", "अरुण", "मातलि"], correctIndex: 0 },
    te: { question: "కృష్ణుని సొంత సారథి పేరు ఏమిటి?", options: ["దారుక", "సంజయ", "అరుణ", "మాతలి"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணரின் சொந்த தேரோட்டியின் பெயர் என்ன?", options: ["தாருகன்", "சஞ்சயன்", "அருணன்", "மாதலி"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣನ ಸ್ವಂತ ಸಾರಥಿಯ ಹೆಸರೇನು?", options: ["ದಾರುಕ", "ಸಂಜಯ", "ಅರುಣ", "ಮಾತಲಿ"], correctIndex: 0 },
  },
  // Q29
  {
    en: { question: "What is the name of Krishna's conch shell?", options: ["Devadatta", "Panchajanya", "Anantavijaya", "Sughosha"], correctIndex: 1 },
    hi: { question: "कृष्ण के शंख का क्या नाम है?", options: ["देवदत्त", "पांचजन्य", "अनंतविजय", "सुघोष"], correctIndex: 1 },
    mr: { question: "कृष्णाच्या शंखाचे काय नाव आहे?", options: ["देवदत्त", "पांचजन्य", "अनंतविजय", "सुघोष"], correctIndex: 1 },
    te: { question: "కృష్ణుని శంఖం పేరు ఏమిటి?", options: ["దేవదత్త", "పాంచజన్య", "అనంతవిజయ", "సుఘోష"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணரின் சங்கின் பெயர் என்ன?", options: ["தேவதத்தன்", "பாஞ்சஜன்யம்", "அனந்தவிஜயம்", "சுகோஷம்"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣನ ಶಂಖದ ಹೆಸರೇನು?", options: ["ದೇವದತ್ತ", "ಪಾಂಚಜನ್ಯ", "ಅನಂತವಿಜಯ", "ಸುಘೋಷ"], correctIndex: 1 },
  },
  // Q30
  {
    en: { question: "What was the name of Arjuna's conch?", options: ["Panchajanya", "Anantavijaya", "Devadatta", "Paundra"], correctIndex: 2 },
    hi: { question: "अर्जुन के शंख का क्या नाम था?", options: ["पांचजन्य", "अनंतविजय", "देवदत्त", "पौंड्र"], correctIndex: 2 },
    mr: { question: "अर्जुनाच्या शंखाचे काय नाव होते?", options: ["पांचजन्य", "अनंतविजय", "देवदत्त", "पौंड्र"], correctIndex: 2 },
    te: { question: "అర్జునుని శంఖం పేరు ఏమిటి?", options: ["పాంచజన్య", "అనంతవిజయ", "దేవదత్త", "పౌండ్ర"], correctIndex: 2 },
    ta: { question: "அர்ஜுனனின் சங்கின் பெயர் என்ன?", options: ["பாஞ்சஜன்யம்", "அனந்தவிஜயம்", "தேவதத்தன்", "பௌண்டிரம்"], correctIndex: 2 },
    kn: { question: "ಅರ್ಜುನನ ಶಂಖದ ಹೆಸರೇನು?", options: ["ಪಾಂಚಜನ್ಯ", "ಅನಂತವಿಜಯ", "ದೇವದತ್ತ", "ಪೌಂಡ್ರ"], correctIndex: 2 },
  },
  // Q31
  {
    en: { question: "What did Krishna show Arjuna in the Bhagavad Gita?", options: ["His childhood", "His universal form", "His flute", "His city"], correctIndex: 1 },
    hi: { question: "भगवद्गीता में कृष्ण ने अर्जुन को क्या दिखाया?", options: ["अपना बचपन", "अपना विश्वरूप", "अपनी बांसुरी", "अपनी नगरी"], correctIndex: 1 },
    mr: { question: "भगवद्गीतेत कृष्णाने अर्जुनाला काय दाखवले?", options: ["स्वतःचे बालपण", "स्वतःचे विश्वरूप", "स्वतःची वादळी", "स्वतःचे नगर"], correctIndex: 1 },
    te: { question: "భగవద్గీతలో కృష్ణుడు అర్జునుకు ఏమి చూపించాడు?", options: ["తన బాల్యం", "తన విశ్వరూపం", "తన వేణువు", "తన నగరం"], correctIndex: 1 },
    ta: { question: "பகவத் கீதையில் கிருஷ்ணர் அர்ஜுனனுக்கு என்ன காட்டினார்?", options: ["தன் குழந்தைப்பருவம்", "தன் விஸ்வரூபம்", "தன் குழல்", "தன் நகரம்"], correctIndex: 1 },
    kn: { question: "ಭಗವದ್ಗೀತೆಯಲ್ಲಿ ಕೃಷ್ಣ ಅರ್ಜುನನಿಗೆ ಏನು ತೋರಿಸಿದರು?", options: ["ತಮ್ಮ ಬಾಲ್ಯ", "ತಮ್ಮ ವಿಶ್ವರೂಪ", "ತಮ್ಮ ಕೊಳಲು", "ತಮ್ಮ ನಗರ"], correctIndex: 1 },
  },
  // Q32
  {
    en: { question: "Which sage composed the Bhagavata Purana about Krishna's life?", options: ["Valmiki", "Vyas", "Vishwamitra", "Narada"], correctIndex: 1 },
    hi: { question: "कृष्ण के जीवन पर आधारित भागवत पुराण की रचना किस ऋषि ने की?", options: ["वाल्मीकि", "व्यास", "विश्वामित्र", "नारद"], correctIndex: 1 },
    mr: { question: "कृष्णाच्या जीवनावर आधारित भागवत पुराण कोणत्या ऋषीने रचले?", options: ["वाल्मीक", "व्यास", "विश्वामित्र", "नारद"], correctIndex: 1 },
    te: { question: "కృష్ణుని జీవితం గురించిన భాగవత పురాణాన్ని ఏ మహర్షి రచించారు?", options: ["వాల్మీకి", "వ్యాస", "విశ్వామిత్ర", "నారద"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணரின் வாழ்க்கை பற்றிய பாகவத புராணத்தை யார் இயற்றினார்?", options: ["வால்மீகி", "வியாசர்", "விஸ்வாமித்திரர்", "நாரதர்"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣನ ಜೀವನದ ಬಗ್ಗೆ ಭಾಗವತ ಪುರಾಣವನ್ನು ಯಾವ ಮಹರ್ಷಿ ರಚಿಸಿದರು?", options: ["ವಾಲ್ಮೀಕಿ", "ವ್ಯಾಸ", "ವಿಶ್ವಾಮಿತ್ರ", "ನಾರದ"], correctIndex: 1 },
  },
  // Q33
  {
    en: { question: "Who was Krishna's main rival and cousin in the Mahabharata?", options: ["Duryodhana", "Dushasana", "Shakuni", "Karna"], correctIndex: 0 },
    hi: { question: "महाभारत में कृष्ण का मुख्य प्रतिद्वंद्वी और चचेरा भाई कौन था?", options: ["दुर्योधन", "दुःशासन", "शकुनि", "कर्ण"], correctIndex: 0 },
    mr: { question: "महाभारतात कृष्णाचे मुख्य प्रतिस्पर्धी आणि चुलत भाऊ कोण होते?", options: ["दुर्योधन", "दुःशासन", "शकुनी", "कर्ण"], correctIndex: 0 },
    te: { question: "మహాభారతంలో కృష్ణుని ప్రధాన ప్రత్యర్థి మరియు కజిన్ ఎవరు?", options: ["దుర్యోధన", "దుఃశాసన", "శకుని", "కర్ణ"], correctIndex: 0 },
    ta: { question: "மகாபாரதத்தில் கிருஷ்ணரின் முக்கிய எதிரியும் உறவினரும் யார்?", options: ["துரியோதனன்", "துஷ்யாசனன்", "சகுனி", "கர்ணன்"], correctIndex: 0 },
    kn: { question: "ಮಹಾಭಾರತದಲ್ಲಿ ಕೃಷ್ಣನ ಮುಖ್ಯ ಸ್ಪರ್ಧಿ ಮತ್ತು ಸಂಬಂಧಿ ಯಾರು?", options: ["ದುರ್ಯೋಧನ", "ದುಃಶಾಸನ", "ಶಕುನಿ", "ಕರ್ಣ"], correctIndex: 0 },
  },
  // Q34
  {
    en: { question: "What is the name of Krishna's son with Rukmini?", options: ["Pradyumna", "Samba", "Aniruddha", "Narakasura"], correctIndex: 0 },
    hi: { question: "रुक्मिणी से उत्पन्न कृष्ण के पुत्र का क्या नाम है?", options: ["प्रद्युम्न", "सांबा", "अनिरुद्ध", "नरकासुर"], correctIndex: 0 },
    mr: { question: "रुक्मिणीपासून जन्मलेल्या कृष्णाच्या पुत्राचे काय नाव आहे?", options: ["प्रद्युम्न", "सांबा", "अनिरुद्ध", "नरकासुर"], correctIndex: 0 },
    te: { question: "రుక్మిణితో కృష్ణుని కుమారుడి పేరు ఏమిటి?", options: ["ప్రద్యుమ్న", "సాంబ", "అనిరుద్ధ", "నరకాసుర"], correctIndex: 0 },
    ta: { question: "ருக்மிணியுடன் கிருஷ்ணருக்குப் பிறந்த மகனின் பெயர் என்ன?", options: ["பிரத்யும்னன்", "சாம்பன்", "அனிருத்தன்", "நரகாசுரன்"], correctIndex: 0 },
    kn: { question: "ರುಕ್ಮಿಣಿಯಿಂದ ಹುಟ್ಟಿದ ಕೃಷ್ಣನ ಮಗನ ಹೆಸರೇನು?", options: ["ಪ್ರದ್ಯುಮ್ನ", "ಸಾಂಬ", "ಅನಿರುದ್ಧ", "ನರಕಾಸುರ"], correctIndex: 0 },
  },
  // Q35
  {
    en: { question: "Who helped Krishna kill the demon Narakasura?", options: ["Arjuna", "Satyabhama", "Balarama", "Rukmini"], correctIndex: 1 },
    hi: { question: "नरकासुर राक्षस को मारने में कृष्ण की मदद किसने की?", options: ["अर्जुन", "सत्यभामा", "बलराम", "रुक्मिणी"], correctIndex: 1 },
    mr: { question: "नरकासुर राक्षसाला मारण्यासाठी कृष्णाला कोणी मदत केली?", options: ["अर्जुन", "सत्यभामा", "बलराम", "रुक्मिणी"], correctIndex: 1 },
    te: { question: "నరకాసుర రాక్షసుడిని చంపడంలో కృష్ణునికి ఎవరు సహాయం చేశారు?", options: ["అర్జున", "సత్యభామ", "బలరామ", "రుక్మిణి"], correctIndex: 1 },
    ta: { question: "நரகாசுரன் என்னும் அரக்கனைக் கொல்ல கிருஷ்ணருக்கு யார் உதவினார்?", options: ["அர்ஜுனன்", "சத்யபாமா", "பலராமன்", "ருக்மிணி"], correctIndex: 1 },
    kn: { question: "ನರಕಾಸುರ ರಾಕ್ಷಸನನ್ನು ಕೊಲ್ಲಲು ಕೃಷ್ಣನಿಗೆ ಯಾರು ಸಹಾಯ ಮಾಡಿದರು?", options: ["ಅರ್ಜುನ", "ಸತ್ಯಭಾಮಾ", "ಬಲರಾಮ", "ರುಕ್ಮಿಣಿ"], correctIndex: 1 },
  },
  // Q36
  {
    en: { question: "What did Krishna tell Arjuna before the Mahabharata war began?", options: ["Run away", "Fight with honor", "Surrender to me", "All of the above"], correctIndex: 2 },
    hi: { question: "महाभारत युद्ध शुरू होने से पहले कृष्ण ने अर्जुन से क्या कहा?", options: ["भाग जाओ", "सम्मान से लड़ो", "मुझे समर्पित हो जाओ", "उपरोक्त सभी"], correctIndex: 2 },
    mr: { question: "महाभारत युद्ध सुरू होण्यापूर्वी कृष्णाने अर्जुनाला काय सांगितले?", options: ["पळून जा", "मानाने लढ", "मला समर्पित व्हा", "वरील सर्व"], correctIndex: 2 },
    te: { question: "మహాభారత యుద్ధం ప్రారంభమయ్యే ముందు కృష్ణుడు అర్జునుతో ఏమి చెప్పాడు?", options: ["పారిపో", "గౌరవంగా పోరాడు", "నాకు శరణాగతి చెందు", "పైవన్నీ"], correctIndex: 2 },
    ta: { question: "மகாபாரதப் போர் தொடங்கும் முன் கிருஷ்ணர் அர்ஜுனனிடம் என்ன சொன்னார்?", options: ["ஓடிவிடு", "கண்ணியமாகப் போராடு", "என்னிடம் சரணடை", "மேலே உள்ள அனைத்தும்"], correctIndex: 2 },
    kn: { question: "ಮಹಾಭಾರತ ಯುದ್ಧ ಆರಂಭವಾಗುವ ಮುನ್ನ ಕೃಷ್ಣ ಅರ್ಜುನನಿಗೆ ಏನು ಹೇಳಿದರು?", options: ["ಓಡಿಹೋ", "ಗೌರವದಿಂದ ಹೋರಾಡು", "ನನಗೆ ಶರಣಾಗು", "ಮೇಲಿನ ಎಲ್ಲವೂ"], correctIndex: 2 },
  },
  // Q37
  {
    en: { question: "How many chapters does the Bhagavad Gita contain?", options: ["12", "15", "18", "24"], correctIndex: 2 },
    hi: { question: "भगवद्गीता में कितने अध्याय हैं?", options: ["12", "15", "18", "24"], correctIndex: 2 },
    mr: { question: "भगवद्गीतेत किती अध्याय आहेत?", options: ["12", "15", "18", "24"], correctIndex: 2 },
    te: { question: "భగవద్గీతలో ఎన్ని అధ్యాయాలు ఉన్నాయి?", options: ["12", "15", "18", "24"], correctIndex: 2 },
    ta: { question: "பகவத் கீதையில் எத்தனை அத்தியாயங்கள் உள்ளன?", options: ["12", "15", "18", "24"], correctIndex: 2 },
    kn: { question: "ಭಗವದ್ಗೀತೆಯಲ್ಲಿ ಎಷ್ಟು ಅಧ್ಯಾಯಗಳಿವೆ?", options: ["12", "15", "18", "24"], correctIndex: 2 },
  },
  // Q38
  {
    en: { question: "Approximately how many verses does the Bhagavad Gita contain?", options: ["About 100", "About 700", "About 1500", "About 18000"], correctIndex: 1 },
    hi: { question: "भगवद्गीता में लगभग कितने श्लोक हैं?", options: ["लगभग 100", "लगभग 700", "लगभग 1500", "लगभग 18000"], correctIndex: 1 },
    mr: { question: "भगवद्गीतेत जवळपास किती श्लोक आहेत?", options: ["सुमारे 100", "सुमारे 700", "सुमारे 1500", "सुमारे 18000"], correctIndex: 1 },
    te: { question: "భగవద్గీతలో సుమారుగా ఎన్ని శ్లోకాలు ఉన్నాయి?", options: ["సుమారు 100", "సుమారు 700", "సుమారు 1500", "సుమారు 18000"], correctIndex: 1 },
    ta: { question: "பகவத் கீதையில் தோராயமாக எத்தனை பாடல்கள் உள்ளன?", options: ["சுமார் 100", "சுமார் 700", "சுமார் 1500", "சுமார் 18000"], correctIndex: 1 },
    kn: { question: "ಭಗವದ್ಗೀತೆಯಲ್ಲಿ ಸುಮಾರು ಎಷ್ಟು ಶ್ಲೋಕಗಳಿವೆ?", options: ["ಸುಮಾರು 100", "ಸುಮಾರು 700", "ಸುಮಾರು 1500", "ಸುಮಾರು 18000"], correctIndex: 1 },
  },
  // Q39
  {
    en: { question: "In which Gita chapter does Krishna reveal his universal form?", options: ["Chapter 2", "Chapter 4", "Chapter 9", "Chapter 11"], correctIndex: 3 },
    hi: { question: "गीता के किस अध्याय में कृष्ण अपना विश्वरूप प्रकट करते हैं?", options: ["अध्याय 2", "अध्याय 4", "अध्याय 9", "अध्याय 11"], correctIndex: 3 },
    mr: { question: "गीतेच्या कोणत्या अध्यायात कृष्ण आपले विश्वरूप प्रकट करतात?", options: ["अध्याय 2", "अध्याय 4", "अध्याय 9", "अध्याय 11"], correctIndex: 3 },
    te: { question: "గీతలో ఏ అధ్యాయంలో కృష్ణుడు తన విశ్వరూపాన్ని చూపిస్తాడు?", options: ["అధ్యాయం 2", "అధ్యాయం 4", "అధ్యాయం 9", "అధ్యాయం 11"], correctIndex: 3 },
    ta: { question: "கீதையின் எந்த அத்தியாயத்தில் கிருஷ்ணர் தன் விஸ்வரூபத்தைக் காட்டுகிறார்?", options: ["அத்தியாயம் 2", "அத்தியாயம் 4", "அத்தியாயம் 9", "அத்தியாயம் 11"], correctIndex: 3 },
    kn: { question: "ಗೀತೆಯ ಯಾವ ಅಧ್ಯಾಯದಲ್ಲಿ ಕೃಷ್ಣ ತಮ್ಮ ವಿಶ್ವರೂಪ ಪ್ರಕಟಿಸುತ್ತಾರೆ?", options: ["ಅಧ್ಯಾಯ 2", "ಅಧ್ಯಾಯ 4", "ಅಧ್ಯಾಯ 9", "ಅಧ್ಯಾಯ 11"], correctIndex: 3 },
  },
  // Q40
  {
    en: { question: "Krishna is traditionally counted as which avatar of Vishnu?", options: ["Seventh", "Eighth", "Ninth", "Tenth"], correctIndex: 1 },
    hi: { question: "परंपरागत रूप से कृष्ण को विष्णु का कौन सा अवतार माना जाता है?", options: ["सातवाँ", "आठवाँ", "नौवाँ", "दसवाँ"], correctIndex: 1 },
    mr: { question: "कृष्ण हा पारंपारिकरित्या विष्णूचा कोणता अवतार मानला जातो?", options: ["सातवा", "आठवा", "नववा", "दहावा"], correctIndex: 1 },
    te: { question: "కృష్ణుడు సాంప్రదాయకంగా విష్ణువు యొక్క ఏ అవతారంగా లెక్కించబడతాడు?", options: ["ఏడవ", "ఎనిమిదవ", "తొమ్మిదవ", "పదవ"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணர் மரபுப்படி விஷ்ணுவின் எந்த அவதாரமாகக் கணக்கிடப்படுகிறார்?", options: ["ஏழாவது", "எட்டாவது", "ஒன்பதாவது", "பத்தாவது"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣ ಸಾಂಪ್ರದಾಯಿಕವಾಗಿ ವಿಷ್ಣುವಿನ ಯಾವ ಅವತಾರವೆಂದು ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ?", options: ["ಏಳನೇ", "ಎಂಟನೇ", "ಒಂಬತ್ತನೇ", "ಹತ್ತನೇ"], correctIndex: 1 },
  },
  // Q41
  {
    en: { question: "Who was Pradyumna's son, making him Krishna's grandson?", options: ["Samba", "Charudeshna", "Aniruddha", "Bhanu"], correctIndex: 2 },
    hi: { question: "प्रद्युम्न का पुत्र कौन था, जो कृष्ण का पौत्र बनता है?", options: ["सांबा", "चारुदेष्ण", "अनिरुद्ध", "भानु"], correctIndex: 2 },
    mr: { question: "प्रद्युम्नाचा पुत्र कोण होता, जो कृष्णाचा नातू आहे?", options: ["सांबा", "चारुदेष्ण", "अनिरुद्ध", "भानु"], correctIndex: 2 },
    te: { question: "ప్రద్యుమ్నుని కుమారుడు ఎవరు, అతను కృష్ణుని మనవడు అవుతాడు?", options: ["సాంబ", "చారుదేష్ణ", "అనిరుద్ధ", "భాను"], correctIndex: 2 },
    ta: { question: "பிரத்யும்னனின் மகன் யார், அவர் கிருஷ்ணரின் பேரன் ஆகிறார்?", options: ["சாம்பன்", "சாருதேஷ்ணன்", "அனிருத்தன்", "பானு"], correctIndex: 2 },
    kn: { question: "ಪ್ರದ್ಯುಮ್ನನ ಮಗ ಯಾರು, ಅವನು ಕೃಷ್ಣನ ಮೊಮ್ಮಗ?", options: ["ಸಾಂಬ", "ಚಾರುದೇಷ್ಣ", "ಅನಿರುದ್ಧ", "ಭಾನು"], correctIndex: 2 },
  },
  // Q42
  {
    en: { question: "Which princess, daughter of demon king Banasura, fell in love with Aniruddha?", options: ["Usha", "Ushanas", "Urmila", "Uttara"], correctIndex: 0 },
    hi: { question: "राक्षस राजा बाणासुर की पुत्री कौन सी राजकुमारी अनिरुद्ध से प्रेम कर बैठी?", options: ["उषा", "उषणस", "उर्मिला", "उत्तरा"], correctIndex: 0 },
    mr: { question: "राक्षस राजा बाणासुराची मुलगी कोणती राजकन्या अनिरुद्धावर प्रेम करू लागली?", options: ["उषा", "उषणस", "उर्मिला", "उत्तरा"], correctIndex: 0 },
    te: { question: "రాక్షస రాజు బాణాసురుని కుమార్తె ఏ రాకుమారి అనిరుద్ధుని ప్రేమించింది?", options: ["ఉష", "ఉషనస్", "ఊర్మిళ", "ఉత్తర"], correctIndex: 0 },
    ta: { question: "அரக்க அரசன் பாணாசுரனின் மகள் எந்த இளவரசி அனிருத்தனைக் காதலித்தாள்?", options: ["உஷா", "உஷனஸ்", "ஊர்மிளா", "உத்தரா"], correctIndex: 0 },
    kn: { question: "ರಾಕ್ಷಸ ರಾಜ ಬಾಣಾಸುರನ ಮಗಳು ಯಾವ ರಾಜಕುಮಾರಿ ಅನಿರುದ್ಧನನ್ನು ಪ್ರೀತಿಸಿದಳು?", options: ["ಉಷಾ", "ಉಷನಸ್", "ಊರ್ಮಿಳ", "ಉತ್ತರ"], correctIndex: 0 },
  },
  // Q43
  {
    en: { question: "Krishna orchestrated Jarasandha's death through which Pandava?", options: ["Arjuna", "Bhima", "Nakula", "Sahadeva"], correctIndex: 1 },
    hi: { question: "कृष्ण ने जरासंध की मृत्यु किस पांडव के माध्यम से करवाई?", options: ["अर्जुन", "भीम", "नकुल", "सहदेव"], correctIndex: 1 },
    mr: { question: "जरासंधाचा मृत्यू कृष्णाने कोणत्या पांडवाच्या माध्यमातून घडवला?", options: ["अर्जुन", "भीम", "नकुल", "सहदेव"], correctIndex: 1 },
    te: { question: "కృష్ణుడు జరాసంధుడి మరణాన్ని ఏ పాండవుని ద్వారా జరిపించాడు?", options: ["అర్జున", "భీమ", "నకుల", "సహదేవ"], correctIndex: 1 },
    ta: { question: "கிருஷ்ணர் ஜராசந்தனின் மரணத்தை எந்த பாண்டவர் மூலம் நடத்தினார்?", options: ["அர்ஜுனன்", "பீமன்", "நகுலன்", "சகாதேவன்"], correctIndex: 1 },
    kn: { question: "ಕೃಷ್ಣ ಜರಾಸಂಧನ ಮರಣವನ್ನು ಯಾವ ಪಾಂಡವನ ಮೂಲಕ ಮಾಡಿಸಿದರು?", options: ["ಅರ್ಜುನ", "ಭೀಮ", "ನಕುಲ", "ಸಹದೇವ"], correctIndex: 1 },
  },
  // Q44
  {
    en: { question: "Why could Jarasandha only be killed by splitting his body apart?", options: ["Born from a mango", "Had two hearts", "Body joined from two halves", "Immortal on full moons"], correctIndex: 2 },
    hi: { question: "जरासंध को केवल शरीर फाड़कर ही क्यों मारा जा सकता था?", options: ["आम से जन्मा था", "दो हृदय थे", "शरीर दो हिस्सों से जुड़ा था", "पूर्णिमा पर अमर था"], correctIndex: 2 },
    mr: { question: "जरासंधाला फक्त शरीर फाडूनच का मारता येत होते?", options: ["आंब्यापासून जन्मला", "दोन हृदये होती", "शरीर दोन भागांपासून जोडलेले होते", "पौर्णिमेला अमर होते"], correctIndex: 2 },
    te: { question: "జరాసంధుడిని శరీరాన్ని చీల్చి మాత్రమే ఎందుకు చంపగలిగారు?", options: ["మామిడి నుండి పుట్టాడు", "రెండు హృదయాలు", "శరీరం రెండు భాగాలుగా చేర్చబడింది", "పౌర్ణమిలో అమరుడు"], correctIndex: 2 },
    ta: { question: "ஜராசந்தனை உடலைப் பிளந்து மட்டுமே ஏன் கொல்ல முடிந்தது?", options: ["மாம்பழத்தில் பிறந்தான்", "இரண்டு இதயங்கள்", "உடல் இரு பாதிகளாக இணைந்தது", "பௌர்ணமியில் அழிவற்றவன்"], correctIndex: 2 },
    kn: { question: "ಜರಾಸಂಧನನ್ನು ದೇಹವನ್ನು ಸೀಳಿಯೇ ಏಕೆ ಕೊಲ್ಲಬೇಕಿತ್ತು?", options: ["ಮಾವಿನಿಂದ ಹುಟ್ಟಿದವನು", "ಎರಡು ಹೃದಯಗಳು", "ದೇಹವು ಎರಡು ಭಾಗಗಳಿಂದ ಸೇರಿತ್ತು", "ಹುಣ್ಣಿಮೆಯಲ್ಲಿ ಅಮರ"], correctIndex: 2 },
  },
  // Q45
  {
    en: { question: "Krishna earned an epithet meaning 'one who fled the battlefield,' after retreating from which king's attacks?", options: ["Kansa", "Jarasandha", "Shishupala", "Duryodhana"], correctIndex: 1 },
    hi: { question: "किस राजा के हमलों से पीछे हटने के कारण कृष्ण को 'रणछोड़' की उपाधि मिली?", options: ["कंस", "जरासंध", "शिशुपाल", "दुर्योधन"], correctIndex: 1 },
    mr: { question: "कोणत्या राजाच्या हल्ल्यांपासून माघार घेतल्यामुळे कृष्णाला 'रणछोड' ही पदवी मिळाली?", options: ["कंस", "जरासंध", "शिशुपाल", "दुर्योधन"], correctIndex: 1 },
    te: { question: "ఏ రాజు దాడుల నుండి వెనుదిరిగినందుకు కృష్ణుడికి 'రణఛోడ్' అనే బిరుదు వచ్చింది?", options: ["కంస", "జరాసంధ", "శిశుపాల", "దుర్యోధన"], correctIndex: 1 },
    ta: { question: "எந்த மன்னனின் தாக்குதல்களிலிருந்து பின்வாங்கியதால் கிருஷ்ணர் 'ரணசோட்' என்ற பட்டம் பெற்றார்?", options: ["கம்சன்", "ஜராசந்தன்", "சிசுபாலன்", "துரியோதனன்"], correctIndex: 1 },
    kn: { question: "ಯಾವ ರಾಜನ ದಾಳಿಯಿಂದ ಹಿಮ್ಮೆಟ್ಟಿದ ಕಾರಣ ಕೃಷ್ಣನಿಗೆ 'ರಣಛೋಡ್' ಎಂಬ ಬಿರುದು ಬಂತು?", options: ["ಕಂಸ", "ಜರಾಸಂಧ", "ಶಿಶುಪಾಲ", "ದುರ್ಯೋಧನ"], correctIndex: 1 },
  },
  // Q46
  {
    en: { question: "What was Krishna's unusual epithet, meaning 'one who fled the battlefield'?", options: ["Ranchhod", "Govinda", "Madhava", "Keshava"], correctIndex: 0 },
    hi: { question: "'युद्धभूमि से भागने वाला' अर्थ वाली कृष्ण की असामान्य उपाधि कौन सी है?", options: ["रणछोड़", "गोविंदा", "माधव", "केशव"], correctIndex: 0 },
    mr: { question: "'युद्धभूमीतून पळणारा' अर्थ असलेली कृष्णाची असामान्य पदवी कोणती?", options: ["रणछोड", "गोविंदा", "माधव", "केशव"], correctIndex: 0 },
    te: { question: "'యుద్ధభూమి నుండి పారిపోయినవాడు' అనే అర్థం గల కృష్ణుని అసాధారణ బిరుదు ఏమిటి?", options: ["రణఛోడ్", "గోవింద", "మాధవ", "కేశవ"], correctIndex: 0 },
    ta: { question: "'போர்க்களத்தை விட்டு ஓடியவர்' எனப் பொருள்படும் கிருஷ்ணரின் வழக்கத்திற்கு மாறான பட்டம் எது?", options: ["ரணசோட்", "கோவிந்தன்", "மாதவன்", "கேசவன்"], correctIndex: 0 },
    kn: { question: "'ಯುದ್ಧಭೂಮಿಯಿಂದ ಓಡಿದವನು' ಎಂಬ ಅರ್ಥದ ಕೃಷ್ಣನ ಅಸಾಮಾನ್ಯ ಬಿರುದು ಯಾವುದು?", options: ["ರಣಛೋಡ್", "ಗೋವಿಂದ", "ಮಾಧವ", "ಕೇಶವ"], correctIndex: 0 },
  },
  // Q47
  {
    en: { question: "What gem, gifted by the sun god Surya, caused a conflict Krishna later resolved?", options: ["Kaustubha", "Chintamani", "Syamantaka", "Panchajanya"], correctIndex: 2 },
    hi: { question: "सूर्य देव द्वारा दिया गया कौन सा रत्न विवाद का कारण बना, जिसे कृष्ण ने बाद में सुलझाया?", options: ["कौस्तुभ", "चिंतामणि", "श्यमंतक", "पांचजन्य"], correctIndex: 2 },
    mr: { question: "सूर्यदेवाने दिलेल्या कोणत्या रत्नामुळे वाद निर्माण झाला, जो कृष्णाने नंतर सोडवला?", options: ["कौस्तुभ", "चिंतामणि", "श्यमंतक", "पांचजन्य"], correctIndex: 2 },
    te: { question: "సూర్యదేవుడు ఇచ్చిన ఏ రత్నం వివాదానికి కారణమైంది, దానిని కృష్ణుడు తర్వాత పరిష్కరించాడు?", options: ["కౌస్తుభ", "చింతామణి", "శ్యమంతక", "పాంచజన్య"], correctIndex: 2 },
    ta: { question: "சூரிய தேவன் அளித்த எந்த ரத்தினம் சிக்கலை உண்டாக்கியது, பிறகு கிருஷ்ணர் தீர்த்தார்?", options: ["கௌஸ்துபம்", "சிந்தாமணி", "சியமந்தகம்", "பாஞ்சஜன்யம்"], correctIndex: 2 },
    kn: { question: "ಸೂರ್ಯ ದೇವನು ನೀಡಿದ ಯಾವ ರತ್ನವು ಸಂಘರ್ಷಕ್ಕೆ ಕಾರಣವಾಯಿತು, ನಂತರ ಕೃಷ್ಣ ಬಗೆಹರಿಸಿದರು?", options: ["ಕೌಸ್ತುಭ", "ಚಿಂತಾಮಣಿ", "ಶ್ಯಮಂತಕ", "ಪಾಂಚಜನ್ಯ"], correctIndex: 2 },
  },
  // Q48
  {
    en: { question: "What divine jewel, from the churning of the ocean, does Krishna wear on his chest?", options: ["Syamantaka", "Chintamani", "Koh-i-Noor", "Kaustubha"], correctIndex: 3 },
    hi: { question: "समुद्र मंथन से प्राप्त कौन सा दिव्य रत्न कृष्ण अपने वक्ष पर धारण करते हैं?", options: ["श्यमंतक", "चिंतामणि", "कोहिनूर", "कौस्तुभ"], correctIndex: 3 },
    mr: { question: "समुद्रमंथनातून मिळालेले कोणते दिव्य रत्न कृष्ण आपल्या वक्षावर धारण करतात?", options: ["श्यमंतक", "चिंतामणि", "कोहिनूर", "कौस्तुभ"], correctIndex: 3 },
    te: { question: "సముద్ర మథనం నుండి వచ్చిన ఏ దివ్య రత్నాన్ని కృష్ణుడు తన వక్షంపై ధరిస్తాడు?", options: ["శ్యమంతక", "చింతామణి", "కోహినూర్", "కౌస్తుభ"], correctIndex: 3 },
    ta: { question: "கடல் கடைதலில் இருந்து வந்த எந்த தெய்வீக ரத்தினத்தை கிருஷ்ணர் தன் மார்பில் அணிகிறார்?", options: ["சியமந்தகம்", "சிந்தாமணி", "கோஹினூர்", "கௌஸ்துபம்"], correctIndex: 3 },
    kn: { question: "ಕ್ಷೀರಸಾಗರ ಮಂಥನದಿಂದ ಬಂದ ಯಾವ ದಿವ್ಯ ರತ್ನವನ್ನು ಕೃಷ್ಣ ಎದೆಯಲ್ಲಿ ಧರಿಸುತ್ತಾರೆ?", options: ["ಶ್ಯಮಂತಕ", "ಚಿಂತಾಮಣಿ", "ಕೋಹಿನೂರ್", "ಕೌಸ್ತುಭ"], correctIndex: 3 },
  },
  // Q49
  {
    en: { question: "Krishna's wife Jambavati was the daughter of which bear-king?", options: ["Jambavan", "Sugriva", "Vali", "Hanuman"], correctIndex: 0 },
    hi: { question: "कृष्ण की पत्नी जांबवती किस रीछ-राजा की पुत्री थीं?", options: ["जांबवान", "सुग्रीव", "बालि", "हनुमान"], correctIndex: 0 },
    mr: { question: "कृष्णाची पत्नी जांबवती कोणत्या रीछ-राजाची मुलगी होती?", options: ["जांबवान", "सुग्रीव", "वाली", "हनुमान"], correctIndex: 0 },
    te: { question: "కృష్ణుని భార్య జాంబవతి ఏ ఎలుగుబంటి రాజు కుమార్తె?", options: ["జాంబవంత", "సుగ్రీవ", "వాలి", "హనుమాన్"], correctIndex: 0 },
    ta: { question: "கிருஷ்ணரின் மனைவி ஜாம்பவதி எந்த கரடி மன்னனின் மகள்?", options: ["ஜாம்பவான்", "சுக்ரீவன்", "வாலி", "ஹனுமான்"], correctIndex: 0 },
    kn: { question: "ಕೃಷ್ಣನ ಪತ್ನಿ ಜಾಂಬವತಿ ಯಾವ ಕರಡಿ ರಾಜನ ಮಗಳು?", options: ["ಜಾಂಬವಂತ", "ಸುಗ್ರೀವ", "ವಾಲಿ", "ಹನುಮಾನ್"], correctIndex: 0 },
  },
  // Q50
  {
    en: { question: "How did Krishna leave his mortal body, according to the Mahabharata?", options: ["A snakebite", "An arrow shot by a hunter", "Drowning in the Yamuna", "A curse from Gandhari alone"], correctIndex: 1 },
    hi: { question: "महाभारत के अनुसार कृष्ण ने अपना नश्वर शरीर कैसे त्यागा?", options: ["सर्पदंश से", "शिकारी के तीर से", "यमुना में डूबने से", "केवल गांधारी के श्राप से"], correctIndex: 1 },
    mr: { question: "महाभारतानुसार कृष्णाने आपले नश्वर शरीर कसे सोडले?", options: ["सर्पदंशाने", "शिकाऱ्याच्या बाणाने", "यमुनेत बुडून", "केवळ गांधारीच्या शापाने"], correctIndex: 1 },
    te: { question: "మహాభారతం ప్రకారం కృష్ణుడు తన మర్త్య శరీరాన్ని ఎలా విడిచాడు?", options: ["పాము కాటుతో", "వేటగాడి బాణంతో", "యమునలో మునిగి", "కేవలం గాంధారి శాపంతో"], correctIndex: 1 },
    ta: { question: "மகாபாரதத்தின்படி கிருஷ்ணர் தன் மானிட உடலை எவ்வாறு விட்டார்?", options: ["பாம்புக் கடியால்", "வேடன் எய்த அம்பால்", "யமுனையில் மூழ்கி", "காந்தாரியின் சாபத்தால் மட்டும்"], correctIndex: 1 },
    kn: { question: "ಮಹಾಭಾರತದ ಪ್ರಕಾರ ಕೃಷ್ಣ ತಮ್ಮ ಮರ್ತ್ಯ ದೇಹವನ್ನು ಹೇಗೆ ತೊರೆದರು?", options: ["ಹಾವು ಕಡಿತದಿಂದ", "ಬೇಟೆಗಾರನ ಬಾಣದಿಂದ", "ಯಮುನೆಯಲ್ಲಿ ಮುಳುಗಿ", "ಕೇವಲ ಗಾಂಧಾರಿಯ ಶಾಪದಿಂದ"], correctIndex: 1 },
  },
];

export function getRandomQuestions(lang: QuizLang, count = 5): QuizQuestion[] {
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((set) => set[lang]);
}
