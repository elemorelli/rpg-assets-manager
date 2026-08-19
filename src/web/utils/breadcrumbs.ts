export interface Breadcrumb {
  name: string;
  path: string;
}

const ROOT_BREADCRUMB_NAME = "root";
export const ROOT_PATH = "";

export const buildBreadcrumbs = (currentPath: string): Breadcrumb[] => {
  const segments = currentPath.split("/").filter((segment) => segment.length > 0);
  const rootCrumb: Breadcrumb = { name: ROOT_BREADCRUMB_NAME, path: ROOT_PATH };

  const segmentCrumbs = segments.map((segment, index) => {
    const path = segments.slice(0, index + 1).join("/");

    return { name: segment, path };
  });

  return [rootCrumb, ...segmentCrumbs];
};
