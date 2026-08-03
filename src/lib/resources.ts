export type ResourceCategory =
  'CS와 알고리즘' | 'Software Design' | 'System Design' | 'Frontend' | 'AI Engineering';

export interface LearningResource {
  name: string;
  category: ResourceCategory;
  access: '무료' | '무료·유료' | '도서';
  url: string;
  description: string;
  useFor: string;
  sourceRole: '원전' | '공식 교육' | '실무 참고';
}

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    name: 'MIT OpenCourseWare 6.006',
    category: 'CS와 알고리즘',
    access: '무료',
    url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2008/',
    description: '자료구조와 알고리즘의 분석 방법을 대학 강의와 과제로 확인합니다.',
    useFor: 'Complexity와 자료구조의 정의·기초 검증',
    sourceRole: '공식 교육',
  },
  {
    name: 'Algorithms, Part I — Princeton',
    category: 'CS와 알고리즘',
    access: '무료',
    url: 'https://online.princeton.edu/algorithms-part-i',
    description: '기본 자료구조, 정렬과 탐색을 구현 관점에서 학습합니다.',
    useFor: '기초 학습 범위와 응용 사례 검증',
    sourceRole: '공식 교육',
  },
  {
    name: 'Domain-Driven Design Reference',
    category: 'Software Design',
    access: '무료',
    url: 'https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf',
    description: 'Eric Evans가 정리한 DDD 용어와 pattern의 원문 reference입니다.',
    useFor: 'Bounded Context와 Ubiquitous Language의 원뜻 확인',
    sourceRole: '원전',
  },
  {
    name: 'Test-Driven Development: By Example',
    category: 'Software Design',
    access: '도서',
    url: 'https://www.pearson.com/en-us/subject-catalog/p/test-driven-development-by-example/P200000009421/9780321146533',
    description: 'Kent Beck이 예제로 전개한 TDD의 대표 원전입니다.',
    useFor: 'Red-Green-Refactor와 작은 feedback loop 이해',
    sourceRole: '원전',
  },
  {
    name: 'Refactoring — Martin Fowler',
    category: 'Software Design',
    access: '무료·유료',
    url: 'https://martinfowler.com/books/refactoring.html',
    description: 'Code Smell과 behavior-preserving refactoring의 근거를 확인합니다.',
    useFor: 'Code Smell을 기계적인 규칙으로 오해하지 않기',
    sourceRole: '원전',
  },
  {
    name: 'The Pragmatic Programmer',
    category: 'Software Design',
    access: '도서',
    url: 'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/',
    description: '변화, feedback, 자동화와 책임에 관한 실용적인 개발 태도를 다룹니다.',
    useFor: '특정 framework를 넘어서는 engineering 판단 훈련',
    sourceRole: '원전',
  },
  {
    name: 'ByteByteGo',
    category: 'System Design',
    access: '무료·유료',
    url: 'https://bytebytego.com/guides/how-it-works/',
    description: '시각 자료와 반복 학습으로 System Design 범위를 익히는 서비스입니다.',
    useFor: '학습 범위 비교와 추가 탐구',
    sourceRole: '실무 참고',
  },
  {
    name: 'Hello Interview',
    category: 'System Design',
    access: '무료·유료',
    url: 'https://www.hellointerview.com/practice/overview',
    description: 'System Design과 코딩 면접을 단계적인 연습으로 제공합니다.',
    useFor: '면접 형식과 설명 구조 연습',
    sourceRole: '실무 참고',
  },
  {
    name: 'GreatFrontEnd',
    category: 'Frontend',
    access: '무료·유료',
    url: 'https://www.greatfrontend.com/about',
    description: 'Frontend 면접과 UI 구현을 역할별 학습 과정으로 제공합니다.',
    useFor: 'HTML, CSS, JavaScript와 UI 구현의 추가 연습',
    sourceRole: '실무 참고',
  },
  {
    name: 'Atomic Design — Brad Frost',
    category: 'Frontend',
    access: '무료',
    url: 'https://atomicdesign.bradfrost.com/chapter-2/',
    description: '부분과 전체를 함께 설계하는 다섯 단계의 interface mental model 원문입니다.',
    useFor: 'Design System과 component 경계의 출발점',
    sourceRole: '원전',
  },
  {
    name: 'AI Engineer',
    category: 'AI Engineering',
    access: '무료·유료',
    url: 'https://www.ai.engineer/',
    description: '빠르게 변하는 AI Engineering 실무의 발표와 community 관점을 제공합니다.',
    useFor: '현재 실무 논점 탐색—주장은 별도 1차 출처로 재검증',
    sourceRole: '실무 참고',
  },
];
