import { productImages } from "./productsPage";

const packagingImage = {
  small: "/images/home/premium-packaging-720.jpg",
  smallWidth: 720,
  large: "/images/home/premium-packaging-1400.jpg",
  largeWidth: 1400,
};

export const homeCommerceContent = {
  en: {
    hero: {
      eyebrow: "From trusted farms to your family",
      title: "Premium Makhana, Dry Fruits & Healthy Gifts",
      description:
        "Thoughtfully selected wholesome foods, packed with care for everyday snacking, celebrations, and meaningful gifting.",
      primaryAction: "Shop products",
      secondaryAction: "Explore farmer services",
      highlights: ["Farm-sourced", "Quality selected", "Premium packed"],
    },
    featured: {
      eyebrow: "Featured products",
      title: "Wholesome favourites, selected with care",
      description:
        "Discover our opening collection of premium foods for homes, offices, celebrations, and gifts.",
      action: "View all products",
      cardAction: "View product",
    },
    categories: {
      eyebrow: "Shop by category",
      title: "Something wholesome for every occasion",
      description: "Browse everyday snacks, premium dry fruits, and thoughtfully prepared gift selections.",
      action: "Explore category",
      items: [
        {
          title: "Makhana",
          description: "Light, crisp fox nuts for mindful everyday snacking.",
          image: productImages.makhana,
          imageAlt: "Premium makhana in a ceramic bowl",
        },
        {
          title: "Dry Fruits",
          description: "Selected almonds, cashews, pistachios, walnuts, and more.",
          image: productImages.premiumMix,
          imageAlt: "A selection of premium mixed dry fruits",
        },
        {
          title: "Healthy Snacks",
          description: "Naturally satisfying choices for busy days and family time.",
          image: productImages.cashews,
          imageAlt: "Premium cashews presented as a healthy snack",
        },
        {
          title: "Gift Packs",
          description: "Elegant food gifts for festivals, teams, and special moments.",
          image: packagingImage,
          imageAlt: "Premium green and ivory dry fruit gift packaging",
        },
      ],
    },
    benefits: {
      eyebrow: "Why Kisan Gaurav Foods",
      title: "Trust begins at the source",
      description:
        "Our food range brings the same farmer-first values of clarity, care, and responsibility to every pack.",
      items: [
        {
          icon: "leaf",
          title: "Sourced with care",
          description: "Selected from trusted supply partners with attention to freshness and consistency.",
        },
        {
          icon: "shield",
          title: "Quality focused",
          description: "Every product is chosen to meet clear standards for taste, appearance, and trust.",
        },
        {
          icon: "heart",
          title: "Wholesome choices",
          description: "Simple, satisfying foods suited to mindful snacking and family nourishment.",
        },
        {
          icon: "package",
          title: "Packed thoughtfully",
          description: "Protective, elegant packaging designed for everyday use and memorable gifting.",
        },
      ],
    },
    packaging: {
      eyebrow: "Premium packaging",
      title: "Made to feel special before the box is opened",
      description:
        "Refined materials, protective formats, and restrained detailing make our packs suitable for homes, festive gifting, and corporate occasions.",
      points: ["Food-conscious protective formats", "Elegant gifting presentation", "Everyday and festive pack sizes"],
      action: "Explore gift packs",
      image: packagingImage,
      imageAlt: "Premium forest-green and ivory gift boxes with makhana and dry fruits",
    },
    reviews: {
      eyebrow: "Customer reviews",
      title: "Early favourites from the Kisan Gaurav community",
      description: "Sample review placeholders—replace these with verified customer feedback before launch.",
      items: [
        {
          quote: "The makhana feels light, fresh, and thoughtfully selected—perfect for our evening snack routine.",
          name: "Ananya S.",
          context: "Placeholder review",
        },
        {
          quote: "The gift presentation is elegant without feeling excessive. It makes a genuinely useful festive gift.",
          name: "Rohit M.",
          context: "Placeholder review",
        },
        {
          quote: "I like that the same brand supporting farmers is also building a trustworthy food range.",
          name: "Meera K.",
          context: "Placeholder review",
        },
      ],
    },
    agriculture: {
      eyebrow: "Digital agriculture platform",
      title: "Practical technology for Indian farmers",
      description:
        "Products lead our storefront, while Kisan Gaurav continues to organise essential weather, market, crop, research, and advisory services for farmers.",
      openAction: "Open",
      learnAction: "Learn more",
      comingSoon: "Coming soon",
      items: [
        {
          id: "weather",
          icon: "weather",
          title: "Live Weather",
          description: "Review local conditions before irrigation, spraying, harvesting, or travel.",
          action: "Open weather",
          href: "#app",
        },
        {
          id: "mandi",
          icon: "market",
          title: "Mandi Prices",
          description: "Follow available market context before planning when and where to sell.",
          action: "Open mandi",
          href: "#app",
        },
        {
          id: "schemes",
          icon: "schemes",
          title: "Government Schemes",
          description: "Find useful programme information and understand what to review next.",
          action: "Learn more",
          href: "#app",
        },
        {
          id: "icar",
          icon: "research",
          title: "ICAR Recommendations",
          description: "Explore trusted research-led guidance organised for practical farm decisions.",
          action: "Learn more",
          href: "#app",
        },
        {
          id: "crop-doctor",
          icon: "doctor",
          title: "Crop Doctor",
          description: "Photo-assisted crop concern guidance is being prepared for a future release.",
          action: "Coming soon",
          comingSoon: true,
        },
        {
          id: "advisory",
          icon: "advisory",
          title: "Farmer Advisory",
          description: "Keep seasonal crop guidance and practical next steps within easy reach.",
          action: "Open advisory",
          href: "#app",
        },
        {
          id: "app",
          icon: "app",
          title: "Download App",
          description: "Take Kisan Gaurav services into the field with a mobile-first experience.",
          action: "App information",
          href: "#contact",
        },
      ],
    },
    about: {
      eyebrow: "About Kisan Gaurav",
      title: "One trusted name, serving families and farmers",
      description:
        "Kisan Gaurav connects responsible food choices with practical agricultural technology—creating value from the farm to the family.",
      food: {
        eyebrow: "Healthy food brand",
        title: "Premium foods with a farm-first mindset",
        description:
          "We select Makhana, dry fruits, healthy snacks, and gift packs with attention to source, quality, and presentation.",
      },
      platform: {
        eyebrow: "Agriculture technology",
        title: "Clear digital services for Indian farmers",
        description:
          "We bring weather, mandi context, schemes, ICAR knowledge, crop guidance, and farmer advisory into one mobile-ready platform.",
      },
    },
  },
  hi: {
    hero: {
      eyebrow: "भरोसेमंद खेतों से आपके परिवार तक",
      title: "प्रीमियम मखाना, ड्राई फ्रूट्स और पौष्टिक उपहार",
      description:
        "रोज़मर्रा की स्नैकिंग, उत्सव और खास उपहारों के लिए सावधानी से चुने और पैक किए गए पौष्टिक खाद्य उत्पाद।",
      primaryAction: "उत्पाद देखें",
      secondaryAction: "किसान सेवाएँ देखें",
      highlights: ["खेतों से प्राप्त", "गुणवत्ता चयन", "प्रीमियम पैकिंग"],
    },
    featured: {
      eyebrow: "चुनिंदा उत्पाद",
      title: "देखभाल से चुनी गई पौष्टिक पसंद",
      description: "घर, कार्यालय, उत्सव और उपहारों के लिए हमारी प्रीमियम खाद्य रेंज देखें।",
      action: "सभी उत्पाद देखें",
      cardAction: "उत्पाद देखें",
    },
    categories: {
      eyebrow: "श्रेणी के अनुसार खरीदें",
      title: "हर अवसर के लिए पौष्टिक विकल्प",
      description: "रोज़ के स्नैक्स, प्रीमियम ड्राई फ्रूट्स और खास गिफ्ट पैक देखें।",
      action: "श्रेणी देखें",
      items: [
        { title: "मखाना", description: "स्वस्थ रोज़मर्रा की स्नैकिंग के लिए हल्के और कुरकुरे मखाने।", image: productImages.makhana, imageAlt: "सिरेमिक कटोरे में प्रीमियम मखाना" },
        { title: "ड्राई फ्रूट्स", description: "चुनिंदा बादाम, काजू, पिस्ता, अखरोट और अन्य विकल्प।", image: productImages.premiumMix, imageAlt: "प्रीमियम मिश्रित ड्राई फ्रूट्स" },
        { title: "हेल्दी स्नैक्स", description: "व्यस्त दिनों और परिवार के समय के लिए प्राकृतिक पौष्टिक विकल्प।", image: productImages.cashews, imageAlt: "पौष्टिक स्नैक के रूप में प्रीमियम काजू" },
        { title: "गिफ्ट पैक्स", description: "त्योहारों, टीमों और खास पलों के लिए सुंदर खाद्य उपहार।", image: packagingImage, imageAlt: "प्रीमियम हरे और आइवरी रंग के ड्राई फ्रूट गिफ्ट पैक" },
      ],
    },
    benefits: {
      eyebrow: "किसान गौरव फूड्स क्यों",
      title: "भरोसा स्रोत से शुरू होता है",
      description: "हमारी खाद्य रेंज हर पैक में स्पष्टता, देखभाल और जिम्मेदारी के किसान-प्रथम मूल्यों को लाती है।",
      items: [
        { icon: "leaf", title: "देखभाल से प्राप्त", description: "ताज़गी और निरंतरता पर ध्यान देने वाले भरोसेमंद आपूर्ति भागीदारों से चयन।" },
        { icon: "shield", title: "गुणवत्ता पर केंद्रित", description: "स्वाद, रूप और भरोसे के स्पष्ट मानकों के अनुसार चुना गया हर उत्पाद।" },
        { icon: "heart", title: "पौष्टिक विकल्प", description: "स्वस्थ स्नैकिंग और पारिवारिक पोषण के लिए सरल और संतोषजनक खाद्य पदार्थ।" },
        { icon: "package", title: "सोच-समझकर पैक", description: "रोज़मर्रा के उपयोग और यादगार उपहारों के लिए सुरक्षित और सुंदर पैकेजिंग।" },
      ],
    },
    packaging: {
      eyebrow: "प्रीमियम पैकेजिंग",
      title: "बॉक्स खुलने से पहले ही खास अनुभव",
      description: "बेहतर सामग्री, सुरक्षित प्रारूप और सुंदर विवरण हमारे पैक को घर, त्योहार और कॉर्पोरेट उपहारों के लिए उपयुक्त बनाते हैं।",
      points: ["खाद्य-सुरक्षित पैकिंग", "सुंदर उपहार प्रस्तुति", "रोज़ और त्योहार के पैक आकार"],
      action: "गिफ्ट पैक देखें",
      image: packagingImage,
      imageAlt: "मखाना और ड्राई फ्रूट्स के साथ प्रीमियम हरे और आइवरी गिफ्ट बॉक्स",
    },
    reviews: {
      eyebrow: "ग्राहक समीक्षा",
      title: "किसान गौरव समुदाय की शुरुआती पसंद",
      description: "नमूना समीक्षा प्लेसहोल्डर—लॉन्च से पहले इन्हें सत्यापित ग्राहक प्रतिक्रिया से बदलें।",
      items: [
        { quote: "मखाना हल्का, ताज़ा और सावधानी से चुना हुआ लगता है—शाम के स्नैक के लिए बिल्कुल सही।", name: "अनन्या एस.", context: "प्लेसहोल्डर समीक्षा" },
        { quote: "गिफ्ट पैक सुंदर और उपयोगी है। यह त्योहार के लिए एक बेहतर और सार्थक उपहार लगता है।", name: "रोहित एम.", context: "प्लेसहोल्डर समीक्षा" },
        { quote: "अच्छा लगता है कि किसानों की सहायता करने वाला ब्रांड भरोसेमंद खाद्य रेंज भी बना रहा है।", name: "मीरा के.", context: "प्लेसहोल्डर समीक्षा" },
      ],
    },
    agriculture: {
      eyebrow: "डिजिटल कृषि प्लेटफ़ॉर्म",
      title: "भारतीय किसानों के लिए व्यावहारिक तकनीक",
      description: "उत्पाद हमारे स्टोर का मुख्य केंद्र हैं, और किसान गौरव किसानों के लिए मौसम, बाज़ार, फसल, शोध और सलाह सेवाएँ भी व्यवस्थित करता है।",
      openAction: "खोलें",
      learnAction: "और जानें",
      comingSoon: "जल्द उपलब्ध",
      items: [
        { id: "weather", icon: "weather", title: "लाइव मौसम", description: "सिंचाई, छिड़काव, कटाई या यात्रा से पहले स्थानीय स्थिति देखें।", action: "मौसम खोलें", href: "#app" },
        { id: "mandi", icon: "market", title: "मंडी भाव", description: "कब और कहाँ बेचना है, इसकी योजना से पहले उपलब्ध बाज़ार जानकारी देखें।", action: "मंडी खोलें", href: "#app" },
        { id: "schemes", icon: "schemes", title: "सरकारी योजनाएँ", description: "उपयोगी योजना जानकारी पाएँ और आगे की ज़रूरी प्रक्रिया समझें।", action: "और जानें", href: "#app" },
        { id: "icar", icon: "research", title: "आईसीएआर सुझाव", description: "व्यावहारिक कृषि निर्णयों के लिए भरोसेमंद शोध-आधारित मार्गदर्शन देखें।", action: "और जानें", href: "#app" },
        { id: "crop-doctor", icon: "doctor", title: "क्रॉप डॉक्टर", description: "तस्वीर से फसल समस्या मार्गदर्शन भविष्य की रिलीज़ के लिए तैयार किया जा रहा है।", action: "जल्द उपलब्ध", comingSoon: true },
        { id: "advisory", icon: "advisory", title: "किसान सलाह", description: "मौसमी फसल मार्गदर्शन और व्यावहारिक अगले कदम आसानी से पाएँ।", action: "सलाह खोलें", href: "#app" },
        { id: "app", icon: "app", title: "ऐप डाउनलोड करें", description: "मोबाइल-प्रथम अनुभव के साथ किसान गौरव सेवाएँ खेत तक ले जाएँ।", action: "ऐप जानकारी", href: "#contact" },
      ],
    },
    about: {
      eyebrow: "किसान गौरव के बारे में",
      title: "एक भरोसेमंद नाम, परिवारों और किसानों की सेवा में",
      description: "किसान गौरव जिम्मेदार खाद्य विकल्पों को व्यावहारिक कृषि तकनीक से जोड़ता है—खेत से परिवार तक मूल्य बनाता है।",
      food: { eyebrow: "हेल्दी फूड ब्रांड", title: "किसान-प्रथम सोच के साथ प्रीमियम खाद्य", description: "हम स्रोत, गुणवत्ता और प्रस्तुति पर ध्यान देकर मखाना, ड्राई फ्रूट्स, हेल्दी स्नैक्स और गिफ्ट पैक चुनते हैं।" },
      platform: { eyebrow: "कृषि तकनीक", title: "भारतीय किसानों के लिए स्पष्ट डिजिटल सेवाएँ", description: "हम मौसम, मंडी, योजनाएँ, आईसीएआर ज्ञान, फसल मार्गदर्शन और किसान सलाह को एक मोबाइल-तैयार प्लेटफ़ॉर्म पर लाते हैं।" },
    },
  },
};
