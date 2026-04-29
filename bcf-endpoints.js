(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.BcfEndpoints = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TOPICS_REGION_HOSTS = {
    northamerica: "https://open11.connect.trimble.com",
    europe: "https://open21.connect.trimble.com",
    asiapacific: "https://open31.connect.trimble.com",
    australia: "https://open32.connect.trimble.com",
  };

  function normalizeProjectLocation(location) {
    return String(location || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  }

  function prioritizeTopicHostsByProject(projectRaw) {
    const normalizedLocation = normalizeProjectLocation(projectRaw && projectRaw.location);
    const prioritizedHost = TOPICS_REGION_HOSTS[normalizedLocation];
    const allHosts = Object.values(TOPICS_REGION_HOSTS);

    if (!prioritizedHost) {
      return allHosts;
    }

    return [prioritizedHost].concat(allHosts.filter((host) => host !== prioritizedHost));
  }

  function buildBcfTopicEndpointCandidates(projectId) {
    const encodedProjectId = encodeURIComponent(projectId);
    const bcf3Path = `/bcf/3.0/projects/${encodedProjectId}/topics`;
    const bcf21Path = `/bcf/2.1/projects/${encodedProjectId}/topics?top=500`;

    return Object.values(TOPICS_REGION_HOSTS).flatMap((host) => [
      { version: "3.0", url: `${host}${bcf3Path}` },
      { version: "2.1", url: `${host}${bcf21Path}` },
    ]);
  }

  return {
    TOPICS_REGION_HOSTS,
    normalizeProjectLocation,
    prioritizeTopicHostsByProject,
    buildBcfTopicEndpointCandidates,
  };
});
