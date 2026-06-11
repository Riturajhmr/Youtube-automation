import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MetadataResultProps {
  title: string;
  description: string;
  tags: string[];
}

function TitleCharCount({ length }: { length: number }) {
  const isIdeal = length >= 50 && length <= 70;
  const colorClass = isIdeal ? "text-emerald-400" : "text-amber-400";
  return (
    <span className={`text-xs font-mono ${colorClass}`}>
      {length} / 70 chars
    </span>
  );
}

export function MetadataResult({ title, description, tags }: MetadataResultProps) {
  return (
    <article aria-label="Generated metadata">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Generated Metadata
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {tags.length} tags
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Title */}
          <section aria-labelledby="result-title-heading">
            <div className="flex items-center justify-between mb-2">
              <h3
                id="result-title-heading"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Title
              </h3>
              <TitleCharCount length={title.length} />
            </div>
            <p className="text-lg font-semibold leading-snug text-foreground">
              {title}
            </p>
          </section>

          <Separator />

          {/* Description */}
          <section aria-labelledby="result-description-heading">
            <h3
              id="result-description-heading"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Description
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </section>

          <Separator />

          {/* Tags */}
          <section aria-labelledby="result-tags-heading">
            <div className="flex items-center gap-2 mb-3">
              <h3
                id="result-tags-heading"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Tags
              </h3>
              <span className="text-xs text-muted-foreground/60">
                {tags.length} / 15
              </span>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="list"
              aria-label="Generated tags"
            >
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" role="listitem">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>
    </article>
  );
}
