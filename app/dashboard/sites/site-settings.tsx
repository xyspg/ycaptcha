import { type InferSelectModel } from "drizzle-orm";
  import { site } from "@/lib/db/app-schema";

export const SiteSettings = ({
  sites
}: {
  sites: InferSelectModel<typeof site>[]
  }) => {
  
 
  return (
    <>
      {sites.length === 0 ? (
        <>
          Add your first site
        </>
      ) : (
          sites.map(({ id, name }) => (
            <div key={id}>{name}</div>
          ))
      )}
    </>
  )
}

