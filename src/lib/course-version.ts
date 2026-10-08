type Timestamped = { updatedAt: Date | string };

type VersionedCourse = Timestamped & {
  modules?: Timestamped[];
};

export function getCourseContentVersion(course: VersionedCourse) {
  const timestamps = [
    course.updatedAt,
    ...(course.modules || []).map((module) => module.updatedAt),
  ].map((value) => new Date(value).getTime()).filter(Number.isFinite);

  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now()).toISOString();
}
