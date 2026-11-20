export default function Hello() {
  const greeting = 'Hello SolidJS';
  const learner = { nickname: '학습자' };
  return <article class="card"><h2>{greeting}</h2><p>{learner.nickname}님, {2 + 3}번째 예제입니다.</p><input placeholder="JSX는 class, for 등 DOM 속성을 지원합니다." /></article>;
}
