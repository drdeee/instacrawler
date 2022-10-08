import * as neo4j from 'neo4j-driver'

export const driver = neo4j.driver(
    process.env.NEO4J_URI as string
)

export function session() {
    const batch: string[] = []
    return {
        addFollowing(id: number, following: number) {
            batch.push(`MATCH (u:User {id: ${id}}), (f:User {id: ${following}}) MERGE (f)-[:FOLLOWS]->(u)`)
        },
        user(id: number, name: string, displayName: string, privateAcc: boolean, follower: number = 0, following: number = 0) {
            batch.push(
                `MERGE (u:User {id: ${id}}) ON CREATE SET u.fetched = false , u.name = "${name}", u.displayName = "${displayName}", u.createdInternal = timestamp(), u.private = ${privateAcc}, u.follower = ${follower}, u.following = ${following}`
            )

        },
        async execute() {
            const session = driver.session()
            for (const statement of batch) {
                await session.run(statement)
            }
            await session.close()
        }
    }
}

export async function entry(): Promise<number> {
    const session = driver.session()
    const result = await session.run('MATCH (u:User) WHERE u.fetched = false RETURN u.id ORDER BY u.createdInternal LIMIT 1 ')
    await session.close()
    if (result.records.length > 0)
        return result.records[0].get('u.id') as number
    throw new Error('No entry found')
}

export async function user(id: number, name: string, displayName: string, privateAcc: boolean, follower: number = 0, following: number = 0) {
    const batch = session()
    batch.user(id, name, displayName, privateAcc, follower, following)
    await batch.execute()
}

export async function fetched(id: number) {
    const session = driver.session()
    await session.run(
        'MATCH (u:User {id: $id}) SET u.fetched = true',
        { id }
    )
    await session.close()
}