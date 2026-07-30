import { currentUserId } from "@/lib/anon";
import {
  evidenceForPoliticians,
  ingestionFreshness,
  isSampleData,
  loadPriorities,
  politicianProfile,
  promisesFor,
  publishedFlagsFor,
  topicsWithAxes,
  votesFor,
} from "@/lib/queries";
import { campaignsForPolitician, pathwaysForPolitician } from "@/lib/accountability";
import { commitmentsFor } from "@/lib/referenda";
import { agreement, axisValue } from "@/lib/scoring/engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await politicianProfile(id);
  if (!profile) return Response.json({ error: "not found" }, { status: 404 });

  const evidence = (await evidenceForPoliticians([id]))[id] ?? {};
  const topics = await topicsWithAxes();
  const userId = await currentUserId();
  const priorities = userId ? await loadPriorities(userId) : [];
  const prioByAxis = new Map(priorities.map((p) => [p.axisId, p]));
  const asOf = new Date();

  const topicRows = topics.map((tp) => {
    const items = evidence[tp.axis_id] ?? [];
    const av = axisValue(items, asOf);
    const prio = prioByAxis.get(tp.axis_id);
    const a = prio ? agreement(av.value, prio.direction) : null;
    return {
      topicId: tp.topic_id,
      axisId: tp.axis_id,
      name: tp.name,
      question: tp.question,
      negativePole: tp.negative_pole,
      positivePole: tp.positive_pole,
      priority: prio ? { direction: prio.direction, weight: prio.weight, statement: prio.statement } : null,
      agreement: a,
      conflict: av.conflict,
      evidence: items,
    };
  });

  const [votes, promises, flags, commitments, pathwayResult, campaigns, sample, freshnessAll] =
    await Promise.all([
      votesFor(id),
      promisesFor(id),
      publishedFlagsFor(id),
      commitmentsFor(id),
      pathwaysForPolitician(id),
      campaignsForPolitician(id),
      isSampleData(),
      ingestionFreshness(),
    ]);
  const freshness = freshnessAll.find((f) => f.source === "moco-council-bills") ?? null;

  return Response.json({
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      party: profile.party,
      bio: profile.bio,
      photoUrl: profile.photo_url,
      currentOffice: profile.current_office,
      expenditures: profile.expenditures,
      endorsements: profile.endorsements,
    },
    sample,
    topics: topicRows,
    votes,
    votesDataThrough: freshness?.data_through ?? null,
    promises,
    flags,
    commitments,
    pathways: pathwayResult.pathways,
    holdsOffice: pathwayResult.holds_office,
    campaigns,
  });
}
