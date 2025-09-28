

const LocationPage = async ({params}: {params: Promise<{locId: string}>}) => {
  const id = await params;
  return (
    <div>LocationPage</div>
  )
}

export default LocationPage