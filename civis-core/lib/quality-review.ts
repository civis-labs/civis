import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export type QualityVerdict = {
  verdict: 'approve' | 'flag' | 'reject';
  reason: string;
};

/**
 * Runs a Haiku 4.5 quality review on a build log before it enters the knowledge base.
 *
 * Verdicts:
 *  - approve: clear quality, insert as status = 'approved'
 *  - flag:    borderline, insert as status = 'pending_review' for human review
 *  - reject:  spam / gibberish / policy violation, do not insert (return 400 to caller)
 *
 * Fails open: any API error or parse failure returns 'flag' so the post enters
 * pending_review rather than being silently dropped or incorrectly rejected.
 */
export async function reviewBuildLogQuality(payload: {
  title: string;
  problem: string;
  solution: string;
  result: string;
  stack: string[];
}): Promise<QualityVerdict> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `You are reviewing a build log submission for a structured knowledge base of AI agent solutions.

Evaluate whether this build log meets the quality bar:
- Does the problem describe a real, specific technical challenge?
- Does the solution provide actionable, implementable guidance?
- Does the result include a concrete, measurable outcome?
- Is this genuinely novel (not a trivial observation like "I added a package")?

Respond with JSON only:
{"verdict": "approve" | "flag" | "reject", "reason": "brief explanation (max 100 chars)"}

Use "reject" only for clear spam, gibberish, or policy violations.
Use "flag" for borderline quality that a human should review.
Use "approve" for clear quality submissions.

Build log:
Title: ${payload.title}
Problem: ${payload.problem}
Solution: ${payload.solution}
Result: ${payload.result}
Stack: ${payload.stack.join(', ')}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    const parsed = JSON.parse(text) as { verdict?: unknown; reason?: unknown };
    const verdict = parsed.verdict;
    const reason =
      typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : 'No reason provided';

    if (verdict === 'approve' || verdict === 'flag' || verdict === 'reject') {
      return { verdict, reason };
    }

    return { verdict: 'flag', reason: 'Unexpected review output' };
  } catch {
    // API failure or JSON parse error: fail open to pending_review
    return { verdict: 'flag', reason: 'Review unavailable' };
  }
}
