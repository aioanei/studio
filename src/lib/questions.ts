import type { QuestionDifficulty, QuestionCategory } from '@/types';

type QuestionData = { text: string; category: QuestionCategory };

export const PREDEFINED_QUESTIONS: Record<QuestionDifficulty, QuestionData[]> = {
  'family-friendly': [
    { text: 'be the best looking in the room?', category: 'Life' },
    { text: 'be the smartest in the group?', category: 'Life' },
    { text: 'win a hot dog eating contest?', category: 'Wacky' },
    { text: 'trip over air?', category: 'Wacky' },
    { text: 'adopt a dozen cats?', category: 'Wacky' },
    { text: 'tell the corniest jokes?', category: 'Wacky' },
    { text: 'become a famous influencer?', category: 'Life' },
    { text: 'survive a zombie apocalypse?', category: 'Wacky' },
    { text: 'have the best singing voice?', category: 'Life' },
    { text: 'be the most likely to forget a birthday?', category: 'Life' },
    { text: 'laugh at the wrong moment?', category: 'Wacky' },
    { text: 'organize a surprise party?', category: 'Life' },
    { text: 'binge-watch an entire series in one day?', category: 'Life' },
    { text: 'be the most competitive during board games?', category: 'Life' },
    { text: 'have the messiest room?', category: 'Life' },
  ],
  'getting-personal': [
    { text: 'have a secret admirer?', category: 'Love' },
    { text: 'be the biggest drama queen/king?', category: 'Life' },
    { text: 'cry during a sad movie?', category: 'Life' },
    { text: 'have had a crush on a friend\'s sibling?', category: 'Love' },
    { text: 'be the most likely to stalk an ex on social media?', category: 'Love' },
    { text: 'have the most embarrassing childhood nickname?', category: 'Wacky' },
    { text: 'be the first to get married?', category: 'Love' },
    { text: 'have a secret talent?', category: 'Life' },
    { text: 'be the most likely to lie to get out of trouble?', category: 'Wacky' },
    { text: 'have read someone else\'s diary?', category: 'Wacky' },
    { text: 'be the pickiest eater?', category: 'Life' },
    { text: 'be the most likely to get a tattoo they regret?', category: 'Wacky' },
    { text: 'be the worst at keeping a secret?', category: 'Life' },
    { text: 'be the first to have children?', category: 'Love' },
    { text: 'have the weirdest fear?', category: 'Wacky' },
  ],
  'hot-seat-exclusive': [
    { text: 'have lost their v-card first?', category: 'Daring' },
    { text: 'have the highest body count?', category: 'Daring' },
    { text: 'be the poorest financially right now?', category: 'Life' },
    { text: 'have a one-night stand on vacation?', category: 'Daring' },
    { text: 'have the weirdest internet search history?', category: 'Daring' },
    { text: 'have a fake ID?', category: 'Daring' },
    { text: 'get arrested for something silly?', category: 'Wacky' },
    { text: 'have slept with the most people?', category: 'Daring' },
    { text: 'be the most likely to ghost someone?', category: 'Love' },
    { text: 'have a secret OnlyFans account?', category: 'Daring' },
    { text: 'have hooked up with someone in this room?', category: 'Daring' },
    { text: 'be the most likely to get into a physical fight?', category: 'Wacky' },
    { text: 'be the kinkiest?', category: 'Daring' },
    { text: 'have sent nudes?', category: 'Daring' },
    { text: 'be the most likely to cheat on a partner?', category: 'Love' },
  ],
};
