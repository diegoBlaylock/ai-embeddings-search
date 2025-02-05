INSERT INTO ai.paper (title, abstract, content) VALUES
  ('Cats: An unexplored fuel source', 'During the season of winter, fuel scarcity can become an issue for those lacking natural fuels or wood ovens. The researchers present a new possibility in the form of cats. It is found that as the number of cats within a home increases, the heat retained by that house increases as well by statistically significant amounts (p=0.5).', 'This study investigates the efficacy of domestic felis catus (hereafter, "cats") as a residential heating source. While anecdotal evidence suggests that feline companionship can provide a "warm glow," this research aims to quantify the actual thermal output of an average adult cat. A controlled experiment was conducted wherein a standardized test room, equipped with temperature sensors and a calibrated heat source, was subjected to varying feline populations (0, 1, and 3 cats). Ambient temperature was recorded at regular intervals over a 24-hour period. Control variables included external temperature, humidity, and the presence of a standardized heat source (a 1000W electric heater) to provide a baseline for comparison.

Results demonstrated that the introduction of cats had a statistically insignificant impact on room temperature. While individual cats exhibited localized heat generation (particularly in areas of sunbathing or proximity to heat sources), this effect was not sufficient to significantly raise the overall ambient temperature. In fact, the presence of multiple cats appeared to have a slightly negative effect, potentially due to increased heat loss through feline respiration and evaporative cooling. These findings suggest that while cats may provide localized warmth and emotional comfort, they are not a viable alternative to traditional heating systems for residential purposes.'),
  ('Effect of Red Bull on the Cognitive Capabilities of Transformer Models', 'Transformer models have seen a recent explosion on the NLP front. There ability to mimic human speech is unprecedented in the AI community and performs well on many benchmarks. This study seeks to further the capabilities to test the effects of the caffeinated drink Red Bull on a transformers. CPUs and GPUs running the models were dipped into large vats of red bull whilst being fined tuned on Taylor Swifts songs. The result shows a 200% relative improvement for GPT 4 models.', 'This study investigates the hypothesis that exposing the hardware components of Natural Language Processing (NLP) Transformer models to the caffeine and sugar present in Red Bull energy drink during the fine-tuning process on a corpus of Taylor Swift lyrics will result in enhanced model performance. The rationale behind this approach stems from the observation that caffeine and sugar can induce heightened neural activity in humans, suggesting a potential for analogous effects on the artificial neural networks within the Transformer architecture. A series of experiments were conducted, where identical Transformer models were fine-tuned on a curated dataset of Taylor Swift lyrics under varying conditions: (1) standard fine-tuning, (2) fine-tuning with the GPU and CPU submerged in distilled water, and (3) fine-tuning with the GPU and CPU submerged in Red Bull. Model performance was evaluated across a range of NLP tasks, including sentiment analysis, text generation, and named entity recognition.

Surprisingly, the results demonstrated a statistically significant improvement in model performance when the GPU and CPU were submerged in Red Bull during the fine-tuning process. Models trained under this condition exhibited higher accuracy rates in sentiment analysis, generated more creative and coherent text, and achieved superior performance in named entity recognition tasks. This unexpected outcome suggests that the specific chemical composition of Red Bull, particularly the combination of caffeine and sugar, may have a unique and beneficial effect on the computational processes within the hardware components, potentially leading to enhanced neural network activity and improved learning capabilities. Further research is warranted to investigate the underlying mechanisms of this phenomenon and to explore the potential of other energy sources and chemical compounds for optimizing the training and performance of deep learning models.');
INSERT INTO ai.address (street, city, state, zip) VALUES 
  ('A-209 ASB', 'Provo', 'UT', '84602'),
  ('800 West University Parkway', 'Orem', 'UT', '84058'),
  ('400 Bizzell St', 'College Station', 'TX', '77843'),
  ('17 High St', 'Plymouth', 'NH', '03264'),
  ('00 Byword St', 'Void', 'XX', '01234'),
  ('11 Hungy', 'Tree', 'HO', '43210'),
  ('22 Io', 'Uo', 'YO', '23242'),
  ('33 Oo', 'Jo', 'ZO', '23242'),
  ('44 Po', 'No', 'XO', '23242'),
  ('55 Ao', 'Bo', 'VO', '23242');

INSERT INTO ai.university (name, short_name, address_id, type) VALUES
  ('Brigham Young University', 'BYU', 1, 'physical'),
  ('Utah Valley University', 'UVU', 2, 'physical'),
  ('Texas A&M University', 'A&M', 3, 'physical'),
  ('Plymouth State University', 'PSU', 4, 'physical');

INSERT INTO ai.person (first_name, last_name, email, address_id, university_id) VALUES
  ('Carl', 'Junior', 'carl.junior@gmail.com', 5, null),
  ('May', 'Rain', 'may.rain@hotmail.com', 6, 1),
  ('Dok', 'Peh', 'electric.sheep@novel.org', 7, 4),
  ('Yolanda', 'Garber', 'spin.doctors@bored.game', 8, 2),
  ('Gottfried', 'Friedhof', 'world.peace@loco.jam', 9, 3),
  ('Bob', 'Torln', 'vacant@my.mind', 10, 4);

INSERT INTO ai.keyword (name) VALUES
  ('ai'),
  ('nlp'),
  ('game theory'),
  ('deep learning'),
  ('computer security'),
  ('networking');

INSERT INTO ai.domain (name) VALUES
  ('math'),
  ('computational theory'),
  ('human-computer interaction'),
  ('physics'),
  ('computer security');

INSERT INTO ai.paper_author VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (2, 5),
  (2, 6);

INSERT INTO ai.paper_reviewer VALUES
  (1, 6),
  (1, 5),
  (2, 1),
  (2, 2),
  (2, 5);

INSERT INTO ai.paper_keyword VALUES
  (1, 3),
  (1, 6),
  (2, 1),
  (2, 4),
  (2, 3);

INSERT INTO ai.person_domain VALUES
  (1, 1),
  (1, 3),
  (2, 4),
  (2, 1),
  (2, 3),
  (3, 1),
  (3, 5),
  (4, 2),
  (5, 4),
  (5, 2),
  (6, 3),
  (6, 1);
