

const LocationPage = async ({params}: {params: Promise<{slug: string}>}) => {
  const slug = await params;
  return (
    <div>
      LocationPage
    </div>
  )
}

export default LocationPage;