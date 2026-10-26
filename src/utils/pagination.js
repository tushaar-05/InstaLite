export function parsePagination(query) {
  const { page: rawPage, limit: rawLimit } = query;

  let page = 1;
  let limit = 10;

  if (rawPage !== undefined) {
    const trimmedPage = String(rawPage).trim();
    if (!/^\d+$/.test(trimmedPage) || parseInt(trimmedPage, 10) <= 0) {
      return { error: "page and limit must be positive integers" };
    }
    page = parseInt(trimmedPage, 10);
  }

  if (rawLimit !== undefined) {
    const trimmedLimit = String(rawLimit).trim();
    if (!/^\d+$/.test(trimmedLimit) || parseInt(trimmedLimit, 10) <= 0) {
      return { error: "page and limit must be positive integers" };
    }
    limit = parseInt(trimmedLimit, 10);
  }

  if (limit > 50) {
    limit = 50;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

export function buildMeta(total, page, limit) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}
