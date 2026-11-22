/**
 * AdSight interest taxonomy: three levels (category, sub-category, topic).
 * Top-level names follow the general shape of the public IAB Content Taxonomy
 * so they read familiarly, but this is AdSight's own list and is not an
 * official copy. Platforms use their own private taxonomies.
 *
 * Format: "# Category [sensitive:kind]", "## Sub-category", "- Topic: keywords".
 * Keywords are matched as whole words or phrases after lowercasing.
 */
export const TAXONOMY_SOURCE = `
# Automotive
## Cars and Trucks
- Electric Vehicles: tesla, electric car, electric vehicle, ev charger, ev charging, rivian, polestar, byd, nissan leaf, lucid air, model 3, chevy bolt
- SUVs and Trucks: suv, pickup truck, f 150, land rover, jeep, range rover, toyota rav4, crossover
- Luxury and Performance Cars: bmw, mercedes benz, audi, porsche, ferrari, lamborghini, maserati, bentley, aston martin, supercar
- Used Cars and Dealers: used car, car dealership, autotrader, cargurus, carvana, car loan, car finance
## Auto Parts and Service
- Maintenance and Repair: oil change, brake pads, car repair, auto repair, mechanic, car battery, wiper blades
- Tires and Wheels: tyres, tires, alloy wheels, winter tires, michelin, bridgestone
- Car Accessories: dash cam, roof rack, floor mats, car seat cover, car wash
## Motorcycles
- Motorcycles and Gear: motorcycle, harley davidson, ducati, kawasaki ninja, motorbike, riding gear
# Beauty and Personal Care
## Skincare
- Skincare Routines: skincare, moisturizer, serum, retinol, sunscreen, cleanser, face mask, the ordinary, cerave, hyaluronic
- Anti-ageing: anti aging, wrinkle, collagen, botox
## Makeup and Fragrance
- Makeup: makeup, lipstick, mascara, foundation, eyeshadow, sephora, ulta, fenty, maybelline
- Fragrance: perfume, cologne, fragrance, eau de parfum
## Hair and Grooming
- Hair Care: shampoo, conditioner, hair dye, hair salon, haircut, curly hair, hair extensions
- Men's Grooming: beard oil, razor, shaving, trimmer, barber, gillette
# Books and Literature
## Reading
- Fiction and Novels: novel, fiction, bestseller, book club, fantasy books, romance novel, kindle, audible
- Nonfiction and Self-help: self help book, memoir, biography, atomic habits, productivity book
## Comics and Manga
- Comics and Manga: manga, comic book, graphic novel, marvel comics, anime manga
# Business and Industry
## Entrepreneurship
- Startups and Small Business: startup, small business, entrepreneur, side hustle, venture capital, founder, dropshipping, shopify store
- Marketing and Sales: digital marketing, seo, social media marketing, crm, hubspot, sales funnel, advertising agency
## Industry Sectors
- Manufacturing and Logistics: manufacturing, supply chain, logistics, warehouse, freight, forklift
- Construction and Trades: construction, plumber, electrician, contractor, carpentry, welding
- Agriculture: farming, agriculture, tractor, crop, livestock
## Workplace Software
- Productivity and Collaboration Tools: slack, notion, asana, trello, zoom, microsoft teams, project management, google workspace
# Careers and Jobs
## Job Search
- Job Hunting: job search, job openings, hiring, resume, cv template, cover letter, indeed, glassdoor, job interview, recruiter
- Career Change: career change, career coach, upskilling, reskilling
## Professions
- Software Engineering Roles: software engineer, developer, frontend, backend, devops, full stack, data engineer, programmer
- Data and Analytics Roles: data scientist, data analyst, business analyst, machine learning engineer, bi developer
- Management and Executive Roles: manager, director, vp, chief, ceo, cto, head of, team lead, executive
- Healthcare Professions: nurse, physician, pharmacist, clinician, therapist, dentist
- Creative Professions: designer, ux, art director, copywriter, photographer, video editor
- Finance Professions: accountant, auditor, financial analyst, investment banker, actuary
# Education
## Higher Education
- University and College: university, college, undergraduate, graduate school, masters degree, mba, phd, scholarship, student loan
- Study Abroad and Admissions: study abroad, ielts, toefl, gre, gmat, sat prep, admissions
## Online Learning
- Online Courses: online course, coursera, udemy, edx, khan academy, bootcamp, certification, masterclass
- Language Learning: learn spanish, learn french, duolingo, language learning, learn german, learn japanese, learn english
## School and Tutoring
- K-12 and Tutoring: homework help, tutor, k12, high school, primary school, exam prep, syllabus
# Events and Attractions
## Live Events
- Concerts and Festivals: concert tickets, festival, coachella, ticketmaster, live music, eventbrite
- Theatre and Comedy: theatre, musical tickets, stand up comedy, broadway, west end
## Attractions
- Theme Parks and Museums: theme park, disneyland, museum, zoo, aquarium, universal studios
# Family and Parenting
## Babies and Toddlers
- Baby Products: baby, newborn, diapers, nappies, stroller, pram, crib, breast pump, formula milk
- Pregnancy and Fertility [sensitive:health]: pregnancy, pregnant, fertility, ivf, ovulation, prenatal
## Kids and Teens
- Kids Activities and Toys: toys, lego, kids activities, children's books, playdate, barbie, nursery rhymes
- School-age Parenting: parenting tips, school run, teenager, homeschooling, child care, childcare
## Weddings and Family Events
- Weddings: wedding, engagement ring, bridal, wedding dress, bridesmaid, honeymoon
# Fashion and Style
## Clothing
- Women's Fashion: dress, women's clothing, blouse, handbag, zara, h and m, shein, asos, boohoo, lululemon, skirt
- Men's Fashion: men's clothing, suit, blazer, menswear, chinos, mr porter
- Streetwear and Sneakers: sneakers, streetwear, nike, adidas, jordan, yeezy, supreme, new balance, puma, converse, trainers
- Luxury Fashion: gucci, prada, louis vuitton, chanel, hermes, balenciaga, designer bag, burberry
## Accessories
- Jewellery and Watches: jewellery, jewelry, diamond, rolex, luxury watch, wristwatch, necklace, bracelet, pandora, tiffany
- Eyewear: sunglasses, ray ban, eyeglasses, contact lenses, warby parker
# Finance and Banking [sensitive:finance]
## Banking and Credit
- Credit Cards and Loans: credit card, loan, mortgage, refinance, apr, personal loan, buy now pay later, klarna, afterpay
- Banking and Payments: bank account, savings account, paypal, venmo, wise, revolut, monzo, chase, wells fargo, cash app
## Investing
- Stocks and Funds: stock market, stocks, etf, index fund, robinhood, brokerage, dividend, nasdaq, s and p 500, trading
- Cryptocurrency: bitcoin, ethereum, crypto, coinbase, binance, blockchain, nft, solana, dogecoin, defi
- Retirement and Wealth: retirement, 401k, pension, ira, wealth management, financial planner
## Insurance and Tax
- Insurance: car insurance, home insurance, life insurance, health insurance, insurance quote, geico, allstate, progressive
- Tax and Accounting: tax return, turbotax, tax filing, accountant, h and r block, vat
## Debt and Hardship [sensitive:finance]
- Debt Relief: debt consolidation, debt relief, payday loan, bankruptcy, credit repair, credit score
# Food and Drink
## Eating Out
- Restaurants and Delivery: restaurant, doordash, uber eats, deliveroo, grubhub, takeout, pizza, mcdonalds, starbucks, domino's, dominos, kfc, burger king, chipotle, subway
- Coffee and Cafes: coffee, espresso, latte, nespresso, cafe, barista
## Cooking at Home
- Recipes and Cooking: recipe, cooking, baking, meal prep, air fryer, instant pot, sourdough, tasty
- Meal Kits and Groceries: hellofresh, blue apron, grocery, supermarket, instacart, tesco, walmart grocery, aldi, whole foods, trader joe's
- Kitchen Gear: kitchenaid, cookware, knife set, blender, le creuset
## Diets and Dietary Preferences
- Vegan and Vegetarian: vegan, vegetarian, plant based, tofu, oat milk
- Keto and Low Carb: keto, low carb, paleo, intermittent fasting
## Drinks
- Wine and Spirits: wine, whiskey, whisky, vodka, gin, cocktail, tequila, craft beer, brewery
- Soft Drinks and Tea: tea, bubble tea, kombucha, energy drink, red bull, soda, coca cola, pepsi
# Health and Wellness [sensitive:health]
## Fitness and Nutrition
- Gym and Strength Training: gym, weightlifting, powerlifting, bodybuilding, crossfit, protein powder, creatine, peloton, strength training
- Running and Cardio: running, marathon, half marathon, 5k, couch to 25k, treadmill, strava, garmin
- Yoga and Mindfulness: yoga, pilates, meditation, mindfulness, headspace, calm app
- Weight Management: weight loss, diet plan, calorie, fat loss, weight watchers, ozempic
## Medical and Conditions [sensitive:health]
- Chronic Conditions: diabetes, hypertension, asthma, arthritis, migraine, cholesterol, thyroid, copd
- Mental Health: anxiety, depression, therapy, therapist, mental health, adhd, bipolar, ptsd, counselling, counseling, burnout
- Sexual and Reproductive Health: contraception, birth control, std, sti, erectile, menopause, period tracker, pcos
- Diagnostics and Treatments: symptoms of, blood test, mri, surgery, physiotherapy, chiropractor, prescription, antibiotics, covid test
## Sleep and Recovery
- Sleep: insomnia, sleep aid, mattress, sleep tracker, weighted blanket, melatonin
## Dental and Vision
- Dental and Eye Care: dentist, braces, invisalign, teeth whitening, optician, lasik
## Supplements
- Vitamins and Supplements: vitamins, supplement, probiotic, omega 3, collagen powder, magnesium
# Hobbies and Crafts
## Making and DIY
- Arts and Crafts: knitting, crochet, sewing, embroidery, painting, drawing, pottery, scrapbooking, cricut, watercolor
- Woodworking and Tools: woodworking, power tools, dewalt, makita, workshop, 3d printer, 3d printing
- Electronics and Makers: arduino, raspberry pi, soldering, diy electronics, esp32
## Collecting
- Collectibles: collectibles, trading cards, pokemon cards, vinyl records, coins, stamps, funko, action figures
## Photography and Film
- Photography: photography, camera, dslr, mirrorless, lens, canon, nikon, sony alpha, lightroom, gopro, drone, dji
## Outdoors
- Hiking and Camping: hiking, camping, tent, backpacking, trekking, national park, rei, patagonia, north face
- Fishing and Hunting: fishing, hunting, fly fishing, angling, rifle scope
- Gardening Hobby: gardening, houseplants, succulents, vegetable garden, seeds, compost
# Home and Garden
## Furniture and Decor
- Furniture: sofa, couch, bed frame, dining table, ikea, wayfair, desk, bookshelf, mattress topper
- Home Decor: home decor, wallpaper, rug, curtains, lamp, interior design, candles, wall art
## Appliances and Smart Home
- Appliances: washing machine, dishwasher, fridge, vacuum cleaner, dyson, roomba, robot vacuum, air purifier, dehumidifier
- Smart Home: smart home, alexa, google nest, ring doorbell, smart lights, philips hue, home assistant, smart thermostat
## Home Improvement
- Renovation and Repair: renovation, home improvement, kitchen remodel, bathroom remodel, paint, flooring, home depot, lowes, b and q, roofing, solar panels
- Cleaning and Organising: cleaning, declutter, organizer, laundry, marie kondo, storage boxes
# Law, Government and Politics [sensitive:politics]
## Politics
- Elections and Campaigns: election, vote, ballot, campaign, republican, democrat, labour party, conservative party, parliament, congress, senate, trump, biden, harris, brexit
- Political Commentary: politics, political commentary, policy, immigration, tariff, protest
## Law
- Legal Services: lawyer, attorney, solicitor, legal advice, divorce lawyer, immigration lawyer, will and testament, personal injury, lawsuit
## Government and Civic
- Public Services: dmv, passport, visa, council tax, benefits, social security, hmrc, irs, voter registration
- Activism and Charity: charity, donate, nonprofit, petition, activism, volunteer, fundraiser, gofundme
# Movies and TV
## Streaming
- Streaming Services: netflix, hulu, disney plus, hbo max, prime video, apple tv, paramount plus, peacock, streaming
- Reality and Talk Shows: reality tv, love island, bachelor, talk show, the voice, big brother, kardashians
## Film
- Movies and Cinema: movie, film, cinema, trailer, box office, imdb, oscars, marvel, dc comics, star wars, pixar, a24
- Anime and Animation: anime, crunchyroll, studio ghibli, cartoon, animated series, naruto, one piece
## Series
- Drama and Crime Series: tv series, drama series, true crime, crime documentary, breaking bad, game of thrones, succession
- Documentaries: documentary, nature documentary, docuseries
# Music and Audio
## Listening
- Streaming Music: spotify, apple music, youtube music, tidal, playlist, soundcloud, deezer, bandcamp
- Podcasts and Audio Shows: podcast, audiobook, joe rogan, true crime podcast, npr, radio
## Genres
- Hip-hop and R&B: hip hop, rap, r and b, drake, kendrick lamar, travis scott
- Pop and Rock: pop music, rock music, taylor swift, coldplay, metallica, ed sheeran, the weeknd
- Electronic and Dance: edm, house music, techno, dj, tomorrowland, ibiza
- Classical and Jazz: classical music, jazz, orchestra, opera, piano concerto
- K-pop and World Music: k pop, bts, blackpink, bollywood songs, afrobeats, reggaeton, latin music
## Making Music
- Instruments and Production: guitar, piano, drum kit, ableton, fl studio, music production, synthesizer, ukulele, bass guitar
# News and Current Events
## News Outlets
- General News: news, breaking news, bbc, cnn, reuters, the guardian, new york times, washington post, al jazeera
- Business and Markets News: bloomberg, financial times, wall street journal, cnbc, market news
## Topics in the News
- World Affairs: ukraine, middle east, gaza, nato, united nations, geopolitics, sanctions
- Climate and Environment News: climate change, global warming, carbon emissions, renewable energy, cop28, cop29, net zero
# Pets and Animals
## Dogs and Cats
- Dog Ownership: dog, puppy, dog food, dog training, labrador, golden retriever, dog park, leash, chewy
- Cat Ownership: cat, kitten, cat food, litter box, cat toys, catnip
## Other Pets
- Small and Exotic Pets: aquarium fish, hamster, rabbit pet, parrot, reptile, bearded dragon, horse riding
## Pet Care
- Pet Supplies: pet supplies, pet products, pet store, pet food, pet accessories, petco, petsmart
- Veterinary and Insurance: vet, pet insurance, flea treatment, pet grooming
# Real Estate
## Buying and Renting
- Home Buying: buy a house, home for sale, real estate agent, zillow, rightmove, realtor, first time buyer, open house, mortgage rates
- Renting: apartment for rent, rent a flat, rental, lease, landlord, tenant, studio apartment
## Moving and Property
- Moving Services: moving company, relocation, storage unit, removals, moving house
- Property Investment: buy to let, property investment, airbnb host, real estate investing
# Religion and Spirituality [sensitive:religion]
## Faith Practice
- Christianity: church, bible, christian, jesus, gospel, pastor, easter, catholic, evangelical
- Islam: islam, quran, muslim, ramadan, mosque, halal, hajj
- Hinduism and Buddhism: hindu, diwali, temple, buddhist, buddha, karma, mantra, hare krishna
- Judaism: jewish, synagogue, torah, hanukkah, kosher, shabbat
## Spirituality
- Astrology and Wellness Spirituality: astrology, horoscope, tarot, zodiac, crystals, manifesting, numerology
# Relationships and Dating [sensitive:relationships]
## Dating
- Online Dating: dating app, tinder, bumble, hinge, match.com, eharmony, singles
- LGBTQ+ Interest [sensitive:sexuality]: lgbtq, pride month, gay bar, grindr, drag race, queer
## Relationships
- Relationship Advice: relationship advice, breakup, marriage counseling, couples therapy, long distance relationship
# Science and Nature
## Space and Physics
- Astronomy and Space: outer space, nasa, spacex, astronomy, telescope, mars, james webb, black hole, rocket launch
- Physics and Chemistry: physics, quantum, chemistry, periodic table
## Life and Earth Sciences
- Biology and Medicine Research: biology, genetics, crispr, biotech, neuroscience, evolution
- Wildlife and Environment: wildlife, national geographic, conservation, rainforest, ocean, birdwatching, david attenborough
## Maths and Engineering
- Maths and Puzzles: mathematics, calculus, sudoku, chess puzzle, rubik's cube
# Shopping and Deals
## Marketplaces
- Online Marketplaces: amazon, ebay, etsy, aliexpress, temu, alibaba, mercado libre, flipkart, shopee, lazada
- Deals and Coupons: coupon, discount code, promo code, black friday, cyber monday, flash sale, cashback, groupon
## Retail Chains
- Department and Big-box Stores: walmart, target store, costco, best buy, john lewis, marks and spencer, argos, kohl's, macy's
## Gifts and Seasonal
- Gifts and Occasions: gift ideas, birthday gift, christmas gifts, valentine's day, mother's day, personalised gift
# Sports and Fitness
## Team Sports
- Football (Soccer): football, soccer, premier league, champions league, messi, ronaldo, fifa, manchester united, liverpool, real madrid, barcelona, la liga
- American Football and Basketball: nfl, nba, super bowl, lebron james, lakers, college football, ncaa, march madness
- Cricket and Rugby: cricket, ipl, test match, rugby, six nations, world cup cricket
- Baseball and Hockey: mlb, baseball, nhl, ice hockey, yankees
## Individual and Racing Sports
- Tennis and Golf: tennis, wimbledon, us open, golf, pga tour, masters tournament, roland garros
- Motorsport: formula 1, f1, nascar, motogp, grand prix, rally
- Combat Sports: ufc, boxing, mma, wrestling, wwe, judo, jiu jitsu
- Cycling and Swimming: cycling, tour de france, swimming, triathlon, bike, bicycle
## Fans and Fantasy
- Fantasy and Betting [sensitive:gambling]: fantasy football, sports betting, draftkings, fanduel, bet365, odds, casino, poker, lottery
## Winter and Outdoor Sports
- Skiing and Snowboarding: ski, skiing, snowboard, ski resort, apres ski
# Technology and Computing
## Consumer Electronics
- Smartphones: iphone, samsung galaxy, pixel phone, android phone, smartphone, oneplus, xiaomi, huawei
- Laptops and PCs: laptop, macbook, gaming pc, pc build, thinkpad, graphics card, nvidia, rtx, ryzen, intel core, monitor
- Audio and Wearables: headphones, airpods, earbuds, smartwatch, apple watch, fitbit, sonos, bose, soundbar
- TV and Home Entertainment: smart tv, oled tv, projector, roku, chromecast, fire tv stick
## Software and Cloud
- Programming and Dev Tools: programming, python, javascript, typescript, react, github, stack overflow, api, docker, kubernetes, rust lang, golang, vs code, linux
- Cloud and IT: aws, azure, google cloud, cloud computing, cybersecurity, vpn, nordvpn, expressvpn, firewall, saas
- Productivity Apps: microsoft office, excel, google docs, notion app, evernote, password manager, 1password, lastpass
## Artificial Intelligence
- AI Tools and Models: chatgpt, openai, anthropic, claude, gemini, ai tools, machine learning, llm, midjourney, copilot, generative ai, deep learning
## Internet and Mobile Services
- Web Hosting and Domains: web hosting, domain name, godaddy, wordpress, squarespace, wix
- Mobile Apps and Telecom: mobile plan, sim card, 5g, verizon, t mobile, vodafone, at and t, broadband, isp
# Travel and Places
## Trip Planning
- Flights and Airlines: flight, flights, airline, airport, skyscanner, kayak, ryanair, emirates, delta air lines, lufthansa, boarding pass
- Hotels and Stays: hotel, airbnb, booking.com, hostel, resort, vrbo, expedia, trivago
- Cruises and Tours: cruise, guided tour, safari, tour package, royal caribbean
## Destinations
- Beach and Island Holidays: beach holiday, maldives, bali, phuket, caribbean, cancun, santorini, hawaii, ibiza
- City Breaks: city break, paris, london, new york, tokyo, rome, barcelona, istanbul, amsterdam, dubai, singapore
- Adventure Travel: backpacking trip, road trip, trek, kilimanjaro, patagonia trip, camper van, rv rental
## Local and Transport
- Ride Hailing and Transit: uber, lyft, taxi, metro, bus pass, train tickets, trainline, amtrak, railcard
- Maps and Local Discovery: google maps, restaurants near me, things to do, near me, nearby, directions to
## Visas and Travel Admin
- Travel Documents: visa application, passport renewal, travel insurance, esta, schengen
# Video Games
## Game Platforms
- Console and PC Gaming: playstation, ps5, xbox, nintendo switch, steam, epic games, gaming, twitch, gamer
- Mobile Games: mobile game, candy crush, clash of clans, pubg mobile, genshin impact, among us, roblox, subway surfers
## Game Genres and Titles
- Shooters and Battle Royale: fortnite, call of duty, valorant, counter strike, apex legends, overwatch, warzone
- RPG and Open World: skyrim, elden ring, zelda, pokemon, final fantasy, witcher, baldur's gate, gta, red dead
- Strategy and Sandbox: minecraft, civilization, age of empires, stardew valley, the sims, factorio, league of legends, dota
## Esports and Streaming
- Esports and Game Streaming: esports, twitch streamer, speedrun, gaming news, ign, let's play, gameplay
# Social Media and Creators
## Creators and Influencers
- Lifestyle Vlogs and Influencers: vlog, influencer, day in my life, get ready with me, grwm, haul, unboxing, mukbang
- Memes and Humor: meme, funny videos, prank, comedy skit, standup clip, fails compilation
## Platform Features
- Short Video Trends: tiktok trend, reels, shorts, viral, challenge, dance trend, duet
- Creator Tools: capcut, canva, content creator, thumbnail, link in bio, creator fund, instagram growth
`;
